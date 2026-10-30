# OOPS INU Shop V2 — SOL payments + NFT inventory starter

## Important status
This is an implementation starter, not a live checkout. The storefront catalog and wallet connect work in setup mode. Checkout is intentionally disabled until you configure and deploy a secure backend, treasury, metadata, NFT authority, and database. No payment is claimed and no NFT is fabricated.

## Contents
- `shop.html`, `shop.js`, `shop-config.js`: character/item catalog, Phantom connect, checkout client, inventory UI
- `backend/server.js`: API starter for order creation, exact SOL transfer verification, and Metaplex Core NFT delivery
- `backend/shop_orders.sql`: private orders table
- `backend/.env.example`: backend-only environment settings
- Previous OOPS INU Hub files: landing page, meme generator, market data endpoint, Supabase schema

## NFT standard
Uses Metaplex Core, a current Solana NFT standard. The minting guide describes metadata URI, asset creation, and approximate base mint costs; actual fees/rent and upload costs vary. Docs: https://www.metaplex.com/docs/smart-contracts/core/create-asset

## Critical pre-production fixes required
The backend is a scaffold and must be reviewed/tested before mainnet:
1. Add a production-ready signer loader and test the configured 64-byte base64 keypair. Keep NFT authority secret only in backend environment/secrets manager.
2. Replace the example metadata base URL with actual uploaded permanent JSON/image metadata. Create metadata JSON for each product.
3. Add an atomic database/RPC claim for `pending -> minting` so two concurrent verification requests cannot mint twice.
4. Verify transaction slot/confirmation, exact signer, exact transfer instruction, and unique signature; bind signature to order and enforce expiry/amount/recipient. The current sample checks core transfer details but needs adversarial tests and robust idempotency.
5. Configure a DAS-compatible NFT indexer and implement wallet ownership checks for inventory; current inventory endpoint intentionally returns an empty result with a notice.
6. Add authentication/rate limits/abuse controls, monitoring, refund/manual-recovery procedures, support contact, privacy policy, terms, and legal/tax review.
7. Use testnet/devnet for end-to-end testing before mainnet. Do not use real funds until an independent review is complete.
8. Add tests for payment mismatch, failed transactions, duplicate callbacks, delayed confirmation, mint failure after payment, and replay attempts.

## Deployment shape
- Frontend: Cloudflare Pages or any static host.
- API: Node.js host supporting environment secrets (e.g. Render/Fly.io/Railway; compare current plans before choosing).
- Database: Supabase PostgreSQL. Run `backend/shop_orders.sql` in the SQL editor.
- RPC: dedicated Solana RPC provider recommended for production.
- Metadata: upload images and JSON to Arweave/IPFS through a reputable pinning/storage provider.
- NFT mint: Metaplex Core using a dedicated authority wallet.

## Environment variables
Copy `backend/.env.example` to a local ignored `.env` for development. Never commit real `.env` values.
- `SOLANA_RPC_URL`
- `TREASURY_WALLET` public address
- `NFT_AUTHORITY_SECRET_KEY_BASE64` private key encoded as base64 (backend only)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` backend only
- `NFT_METADATA_BASE_URL`
- `FRONTEND_ORIGIN`

## Price/catalog
Prices in `shop.js` are illustrative starting prices and are also hardcoded in backend `CATALOG`. Edit both before launch. The backend must always ignore client-provided prices.
