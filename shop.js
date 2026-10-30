(() => {
  const cfg = window.OOPS_SHOP_CONFIG || {};
  const $ = id => document.getElementById(id);
  let wallet = null;
  let publicKey = null;
  const products = [
    {id:"oopsie-basic",name:"Oopsie Basic",kind:"character",priceSol:"0.05",emoji:"🐶",rarity:"Common",description:"The original chaos companion. One Core NFT sent to your wallet."},
    {id:"oopsie-king",name:"Oopsie King",kind:"character",priceSol:"0.12",emoji:"👑",rarity:"Epic",description:"Royal attitude, zero plans. One Core NFT sent to your wallet."},
    {id:"oopsie-astronaut",name:"Oopsie Astronaut",kind:"character",priceSol:"0.15",emoji:"🚀",rarity:"Rare",description:"Space-bound meme energy. One Core NFT sent to your wallet."},
    {id:"golden-sunglasses",name:"Golden Shades",kind:"item",priceSol:"0.04",emoji:"🕶️",rarity:"Rare",description:"A collectible accessory NFT. In-game equipping requires a later profile feature."},
    {id:"oopsie-crown",name:"Oopsie Crown",kind:"item",priceSol:"0.06",emoji:"👑",rarity:"Epic",description:"A collectible crown NFT for your wallet."},
    {id:"meme-frame",name:"Meme Frame",kind:"item",priceSol:"0.03",emoji:"🖼️",rarity:"Common",description:"A collectible profile-frame NFT."}
  ];
  function status(message, error=false) {
    const el=$("shopStatus"); el.textContent=message; el.classList.toggle("error",error);
  }
  function renderCatalog() {
    $("catalog").replaceChildren();
    for(const p of products) {
      const card=document.createElement("article"); card.className="product";
      const art=document.createElement("div");art.className="product-art";art.textContent=p.emoji;
      const h=document.createElement("h3");h.textContent=p.name;
      const rarity=document.createElement("span");rarity.className="status-pill";rarity.textContent=`${p.rarity} · ${p.kind}`;
      const desc=document.createElement("p");desc.textContent=p.description;
      const price=document.createElement("div");price.className="price";price.textContent=`${p.priceSol} SOL`;
      const btn=document.createElement("button");btn.className="btn btn-primary full";btn.textContent="Buy NFT";
      btn.addEventListener("click",()=>checkout(p));
      card.append(art,h,rarity,desc,price,btn);$("catalog").append(card);
    }
  }
  async function connect() {
    const provider = window.phantom?.solana || window.solana;
    if(!provider?.isPhantom) {
      status("Phantom not detected. On mobile, open this page inside Phantom's in-app browser.",true);return;
    }
    try {
      const result=await provider.connect();
      wallet=provider; publicKey=result.publicKey.toString();
      $("connectWallet").textContent=publicKey.slice(0,4)+"…"+publicKey.slice(-4);
      status(`Wallet connected: ${publicKey}. No transaction has been sent yet.`);
      await loadInventory();
    } catch(e) { status("Wallet connection cancelled.",true); }
  }
  async function checkout(product) {
    if(!publicKey || !wallet) { status("Connect Phantom first. No payment has been made.",true);return; }
    if(!cfg.apiBase) { status("Checkout is not live yet: configure the backend URL in shop-config.js. No payment was requested or sent.",true);return; }
    const btn = [...document.querySelectorAll(".product button")].find(b=>b.parentElement.querySelector("h3")?.textContent===product.name);
    if(btn){btn.disabled=true;btn.textContent="Preparing checkout…";}
    try {
      const orderRes=await fetch(`${cfg.apiBase}/api/orders`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({productId:product.id,buyerWallet:publicKey})
      });
      const order=await orderRes.json();
      if(!orderRes.ok) throw new Error(order.error||"Could not create checkout order.");
      if(!order.transactionBase64) throw new Error("Backend did not return a payment transaction. No payment sent.");
      const raw=Uint8Array.from(atob(order.transactionBase64),c=>c.charCodeAt(0));
      const tx=window.solanaWeb3?.Transaction?.from(raw);
      if(!tx) throw new Error("Solana transaction decoder is not configured. No payment sent.");
      const sent=await wallet.signAndSendTransaction(tx);
      status("Transaction submitted. Waiting for server verification; the NFT is not delivered yet.");
      const verifyRes=await fetch(`${cfg.apiBase}/api/orders/${encodeURIComponent(order.orderId)}/verify`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({signature:sent.signature,buyerWallet:publicKey})
      });
      const result=await verifyRes.json();
      if(!verifyRes.ok) throw new Error(result.error||"Payment verification is pending. Check your order status before retrying.");
      status(result.status==="delivered" ? `Payment verified and NFT minted. Asset: ${result.assetAddress}` : `Payment confirmed. Delivery status: ${result.status}. Check order status before retrying.`);
      await loadInventory();
    } catch(e) {
      status(e.message||"Checkout failed. Check the wallet and order status before retrying.",true);
    } finally { if(btn){btn.disabled=false;btn.textContent="Buy NFT";} }
  }
  async function loadInventory() {
    if(!cfg.apiBase||!publicKey) return;
    try {
      const res=await fetch(`${cfg.apiBase}/api/inventory/${encodeURIComponent(publicKey)}`);
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Inventory unavailable");
      const list=$("inventoryList");list.replaceChildren();
      if(!data.assets?.length){list.textContent="No verified NFTs found for this wallet.";return;}
      for(const asset of data.assets){
        const item=document.createElement("div");item.className="inventory-item";
        const name=document.createElement("b");name.textContent=asset.name||"Unnamed NFT";
        const link=document.createElement("a");link.href=asset.explorerUrl;link.target="_blank";link.rel="noopener noreferrer";link.textContent="View on explorer ↗";
        item.append(name,document.createElement("br"),link,document.createElement("br"));
        const small=document.createElement("small");small.textContent=asset.address;item.append(small);list.append(item);
      }
    } catch(e) { status("Inventory could not be loaded from the configured NFT indexer.",true); }
  }
  $("connectWallet").addEventListener("click",connect);
  renderCatalog();
  if(!cfg.apiBase) status("Setup mode: catalog is visible, but checkout is disabled. No real prices are being charged and no NFT ownership is claimed.");
})();
