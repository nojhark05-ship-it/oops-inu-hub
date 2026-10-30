import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bs58 from "bs58";
import { createClient } from "@supabase/supabase-js";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { keypairIdentity, publicKey as umiPublicKey, signerIdentity } from "@metaplex-foundation/umi";
import { mplCore, create as createCoreAsset, generateSigner } from "@metaplex-foundation/mpl-core";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";

dotenv.config();
const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN, methods: ["GET","POST"], allowedHeaders:["Content-Type"] }));
app.use(express.json({limit:"30kb"}));

const required = ["SOLANA_RPC_URL","TREASURY_WALLET","SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","NFT_AUTHORITY_SECRET_KEY_BASE64","NFT_METADATA_BASE_URL"];
const missing = required.filter(k => !process.env[k]);
const db = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}})
  : null;
const connection = process.env.SOLANA_RPC_URL ? new Connection(process.env.SOLANA_RPC_URL, "confirmed") : null;

// Keep this catalog server-side. Client-submitted prices are ignored.
const CATALOG = {
  "oopsie-basic": { name:"Oopsie Basic", priceSol:"0.05", metadataFile:"oopsie-basic.json" },
  "oopsie-king": { name:"Oopsie King", priceSol:"0.12", metadataFile:"oopsie-king.json" },
  "oopsie-astronaut": { name:"Oopsie Astronaut", priceSol:"0.15", metadataFile:"oopsie-astronaut.json" },
  "golden-sunglasses": { name:"Golden Shades", priceSol:"0.04", metadataFile:"golden-sunglasses.json" },
  "oopsie-crown": { name:"Oopsie Crown", priceSol:"0.06", metadataFile:"oopsie-crown.json" },
  "meme-frame": { name:"Meme Frame", priceSol:"0.03", metadataFile:"meme-frame.json" }
};
const solToLamports = s => Math.round(Number(s) * LAMPORTS_PER_SOL);
const jsonError = (res, code, error) => res.status(code).json({error});

function assertConfigured(res) {
  if (missing.length) { jsonError(res,503,`Backend setup incomplete: ${missing.join(", ")}`); return false; }
  return true;
}
function decodeAuthority() {
  const bytes = Buffer.from(process.env.NFT_AUTHORITY_SECRET_KEY_BASE64, "base64");
  const secret = Uint8Array.from(bytes);
  if (!secret.length) throw new Error("NFT authority secret is not configured");
  // A production deployment should validate the expected secret-key format at startup.
  return secret;
}
app.get("/api/health", (_req,res) => res.json({ok:missing.length===0,missingConfiguration:missing}));

// Creates a pending order and an unsigned exact-amount transfer transaction.
// Supabase table constraints and backend-side verification are required before fulfillment.
app.post("/api/orders", async (req,res) => {
  if (!assertConfigured(res)) return;
  try {
    const { productId, buyerWallet } = req.body || {};
    const product = CATALOG[productId];
    if (!product) return jsonError(res,400,"Unknown product.");
    const buyer = new PublicKey(buyerWallet);
    const treasury = new PublicKey(process.env.TREASURY_WALLET);
    const orderId = crypto.randomUUID();
    const amountLamports = solToLamports(product.priceSol);
    const { error: insertError } = await db.from("shop_orders").insert({
      id:orderId, product_id:productId, product_name:product.name, buyer_wallet:buyer.toBase58(),
      treasury_wallet:treasury.toBase58(), amount_lamports:amountLamports, status:"pending"
    });
    if (insertError) throw insertError;
    const latest = await connection.getLatestBlockhash("confirmed");
    const tx = new Transaction({feePayer:buyer, recentBlockhash:latest.blockhash}).add(
      SystemProgram.transfer({fromPubkey:buyer,toPubkey:treasury,lamports:amountLamports})
    );
    tx.lastValidBlockHeight = latest.lastValidBlockHeight;
    const transactionBase64 = tx.serialize({requireAllSignatures:false,verifySignatures:false}).toString("base64");
    res.json({orderId,productId,amountLamports,transactionBase64,expiresAtBlockHeight:latest.lastValidBlockHeight});
  } catch (e) { console.error(e); jsonError(res,400,"Could not create order. Check wallet and backend configuration."); }
});

// Verify the confirmed transaction against the stored order; then mint the NFT.
// Idempotency: order status is checked before minting; production should add a DB lock/RPC function
// around status transition to avoid concurrent duplicate fulfillments.
app.post("/api/orders/:id/verify", async (req,res) => {
  if (!assertConfigured(res)) return;
  try {
    const {signature,buyerWallet } = req.body || {};
    if (!signature || !buyerWallet) return jsonError(res,400,"Signature and buyer wallet are required.");
    const {data:order,error} = await db.from("shop_orders").select("*").eq("id",req.params.id).maybeSingle();
    if (error || !order) return jsonError(res,404,"Order not found.");
    if (order.status === "delivered") return res.json({status:"delivered",assetAddress:order.asset_address});
    if (order.status === "minting") return res.status(202).json({status:"minting"});
    if (order.buyer_wallet !== new PublicKey(buyerWallet).toBase58()) return jsonError(res,403,"Buyer wallet does not match order.");
    const tx = await connection.getParsedTransaction(signature,{commitment:"confirmed",maxSupportedTransactionVersion:0});
    if (!tx || tx.meta?.err) return jsonError(res,409,"Payment is not confirmed successfully yet.");
    const accountKeys = tx.transaction.message.accountKeys.map(k => k.pubkey.toBase58());
    if (!accountKeys.includes(order.buyer_wallet) || !accountKeys.includes(order.treasury_wallet)) return jsonError(res,400,"Transaction does not match order wallets.");
    const transfer = tx.transaction.message.instructions.find(ix =>
      ix.program === "system" && ix.parsed?.type === "transfer" &&
      ix.parsed.info.source === order.buyer_wallet &&
      ix.parsed.info.destination === order.treasury_wallet &&
      Number(ix.parsed.info.lamports) === Number(order.amount_lamports)
    );
    if (!transfer) return jsonError(res,400,"No matching exact SOL transfer found in confirmed transaction.");
    const {error:claimError} = await db.from("shop_orders").update({status:"minting",payment_signature:signature})
      .eq("id",order.id).eq("status","pending");
    if (claimError) throw claimError;
    const product = CATALOG[order.product_id];
    const { umi, signer } = buildUmi();
    const assetSigner = generateSigner(umi);
    const metadataUri = `${process.env.NFT_METADATA_BASE_URL.replace(/\/$/,"")}/${product.metadataFile}`;
    const minted = await createCoreAsset(umi, {
      asset:assetSigner,
      name:product.name,
      uri:metadataUri,
      owner:umiPublicKey(order.buyer_wallet)
    }).sendAndConfirm(umi);
    const assetAddress = assetSigner.publicKey.toString();
    const {error:updateError} = await db.from("shop_orders").update({
      status:"delivered",asset_address:assetAddress,delivered_at:new Date().toISOString()
    }).eq("id",order.id);
    if (updateError) throw updateError;
    res.json({status:"delivered",assetAddress,signature});
  } catch(e) {
    console.error("fulfillment error",e);
    jsonError(res,500,"Payment may be confirmed, but NFT delivery is not confirmed. Contact support with the order ID; do not pay again.");
  }
});
function buildUmi() {
  const secret = decodeAuthority();
  // UMI uses a Solana keypair. Secret must be a valid 64-byte secret key in base64.
  const keypair = Keypair.fromSecretKey(secret);
  const umi = createUmi(process.env.SOLANA_RPC_URL).use(mplCore());
  const umiSigner = fromWeb3JsKeypair(keypair);
  umi.use(keypairIdentity(umiSigner));
  return {umi, signer:umiSigner};
}
// Read inventory via configured NFT indexer is intentionally not faked.
// Configure a DAS provider and verify ownership of Core assets before enabling this endpoint.
app.get("/api/inventory/:wallet", async (req,res) => {
  try { new PublicKey(req.params.wallet); } catch { return jsonError(res,400,"Invalid wallet address."); }
  res.json({assets:[],notice:"NFT indexer is not configured. No inventory claims are made."});
});

const port = Number(process.env.PORT || 3000);
app.listen(port,()=>console.log(`OOPS INU shop API listening on ${port}; configured=${missing.length===0}`));
