(() => {
  const cfg = window.OOPS_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const dialog = $("authDialog");
  let toastTimer;
  function toast(message) {
    const el = $("toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
  }
  const money = (value) => {
    if (value === undefined || value === null || !Number.isFinite(Number(value))) return "—";
    return new Intl.NumberFormat("en-US", {style:"currency",currency:"USD",maximumFractionDigits:Number(value)<1?8:2}).format(Number(value));
  };
  function applyLinks() {
    const pump = cfg.tokenMint ? `https://pump.fun/coin/${encodeURIComponent(cfg.tokenMint)}` : (cfg.pumpUrl || "https://pump.fun/");
    $("buyHero").href = pump; $("pumpFooter").href = pump;
    $("buyHero").textContent = cfg.tokenMint ? "Buy / view on Pump.fun ↗" : "Explore on Pump.fun ↗";
    if (!cfg.tokenMint) $("tokenNotice").hidden = false;
    else $("tokenNotice").hidden = true;
  }
  async function loadMarket() {
    if (!cfg.tokenMint || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cfg.tokenMint)) {
      $("dataStatus").textContent = "Token address not configured";
      $("updatedAt").textContent = "Live data disabled until a valid mint address is configured.";
      return;
    }
    $("dataStatus").textContent = "Checking real market data…";
    try {
      const res = await fetch(`/api/market?mint=${encodeURIComponent(cfg.tokenMint)}`, {headers:{"Accept":"application/json"}});
      if (!res.ok) throw new Error("Market data endpoint unavailable");
      const data = await res.json();
      const pairs = Array.isArray(data.pairs) ? data.pairs : [];
      const pair = pairs.filter(p => p.chainId === "solana").sort((a,b)=>(Number(b.liquidity?.usd)||0)-(Number(a.liquidity?.usd)||0))[0];
      if (!pair) {
        $("dataStatus").textContent = "No market pair found";
        $("updatedAt").textContent = "No real Solana pair returned by DEX Screener.";
        return;
      }
      $("priceValue").textContent = money(pair.priceUsd);
      $("capValue").textContent = (pair.marketCap ?? pair.fdv) == null ? "—" : money(pair.marketCap ?? pair.fdv);
      $("volumeValue").textContent = pair.volume?.h24 == null ? "—" : money(pair.volume.h24);
      $("liquidityValue").textContent = pair.liquidity?.usd == null ? "—" : money(pair.liquidity.usd);
      $("priceSub").textContent = pair.dexId ? `Source: ${pair.dexId}` : "Source: DEX Screener";
      $("volumeSub").textContent = pair.priceChange?.h24 == null ? "24-hour volume" : `24h price change: ${Number(pair.priceChange.h24).toFixed(2)}%`;
      $("dataStatus").textContent = "Live market pair found";
      $("updatedAt").textContent = `Updated ${new Date().toLocaleTimeString()} · DEX Screener`;
      const link = pair.url;
      if (link) $("buyHero").href = cfg.pumpUrl && cfg.tokenMint ? `https://pump.fun/coin/${encodeURIComponent(cfg.tokenMint)}` : link;
    } catch (e) {
      $("dataStatus").textContent = "Live data unavailable";
      $("updatedAt").textContent = "Could not load verified market data. Please try again later.";
      console.warn(e);
    }
  }

  // Original mascot canvas illustration; no remote image needed.
  function drawMeme() {
    const canvas = $("memeCanvas"), ctx = canvas.getContext("2d");
    const top = $("memeTop").value.trim().toUpperCase() || "OOPS";
    const bottom = $("memeBottom").value.trim().toUpperCase() || "STILL HERE";
    const mood = $("memeMood").value;
    const g = ctx.createLinearGradient(0,0,900,900); g.addColorStop(0,"#211433");g.addColorStop(.55,"#3b2148");g.addColorStop(1,"#ff7b31");
    ctx.fillStyle=g;ctx.fillRect(0,0,900,900);
    ctx.fillStyle="#ff8b4320";ctx.beginPath();ctx.arc(450,445,330,0,Math.PI*2);ctx.fill();
    for(let i=0;i<28;i++){ctx.save();ctx.translate((i*137)%900,(i*197)%900);ctx.rotate(i*.7);ctx.fillStyle=i%2?"#ffc56c66":"#ff679b66";ctx.font="25px sans-serif";ctx.fillText(i%2?"✦":"✳",0,0);ctx.restore();}
    // ears and body
    ctx.lineWidth=22;ctx.strokeStyle="#21142a";ctx.lineJoin="round";
    ctx.fillStyle="#ff7139";ctx.beginPath();ctx.moveTo(305,330);ctx.lineTo(230,210);ctx.lineTo(340,270);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(595,330);ctx.lineTo(680,205);ctx.lineTo(565,270);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle="#ff8c3f";ctx.beginPath();ctx.ellipse(450,450,205,225,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle="#fff6e7";
    ctx.beginPath();ctx.ellipse(382,415,49,mood==="panic"?68:54,-.15,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(516,415,49,mood==="panic"?68:54,.15,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle="#21142a";ctx.beginPath();ctx.ellipse(390,420,17,25,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(508,420,17,25,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#21142a";ctx.beginPath();ctx.ellipse(450,mood==="win"?510:500,mood==="win"?40:31,mood==="panic"?40:24,0,0,Math.PI*2);ctx.fill();
    if(mood==="win"){ctx.strokeStyle="#21142a";ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(330,345);ctx.lineTo(405,370);ctx.moveTo(490,370);ctx.lineTo(565,345);ctx.stroke();}
    ctx.fillStyle="#fff0d9";ctx.font="bold 52px 'Space Grotesk', sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.lineWidth=9;ctx.strokeStyle="#160d20";ctx.strokeText(top,450,80,820);ctx.fillText(top,450,80,820);
    ctx.strokeText(bottom,450,820,820);ctx.fillText(bottom,450,820,820);
    ctx.textAlign="left";ctx.font="bold 23px 'DM Mono', monospace";ctx.fillStyle="#ffc56c";ctx.fillText("OOPS INU  •  MEME RESPONSIBLY",36,870);
  }
  $("makeMeme").addEventListener("click",()=>{drawMeme();toast("Meme generated. Download it or share it.");});
  $("downloadMeme").addEventListener("click",()=>{
    drawMeme(); const a=document.createElement("a");a.download="oops-inu-meme.png";a.href=$("memeCanvas").toDataURL("image/png");a.click();
  });
  drawMeme();

  // Demo mission points are explicitly browser-local, never represented as shared leaderboard data.
  const completed = new Set(JSON.parse(localStorage.getItem("oops_missions") || "[]"));
  function updateMissions(){
    document.querySelectorAll("[data-mission]").forEach(btn=>{
      const done=completed.has(btn.dataset.mission);btn.disabled=done;btn.textContent=done?"Completed ✓":"Complete mission";
    });
  }
  document.querySelectorAll("[data-mission]").forEach(btn=>btn.addEventListener("click",async()=>{
    const id=btn.dataset.mission;
    if(id==="meme"){drawMeme();}
    if(id==="community" && !cfg.xUrl && !cfg.telegramUrl){toast("Official social links have not been configured yet.");return;}
    if(id==="community"){if(cfg.xUrl)window.open(cfg.xUrl,"_blank","noopener");else if(cfg.telegramUrl)window.open(cfg.telegramUrl,"_blank","noopener");}
    if(id==="wallet" && !window.solana?.isPhantom){toast("Install Phantom and open this page in a compatible browser first.");return;}
    if(id==="wallet" && window.solana?.isPhantom){try{await window.solana.connect()}catch(e){toast("Wallet connection cancelled.");return;}}
    completed.add(id);localStorage.setItem("oops_missions",JSON.stringify([...completed]));updateMissions();toast("Mission marked complete in this browser.");
  }));
  updateMissions();

  let walletAddress="";
  $("walletBtn").addEventListener("click",async()=>{
    if(!window.solana?.isPhantom){toast("Phantom was not detected. Open this site in a browser with Phantom enabled.");return;}
    try{
      const result=await window.solana.connect();walletAddress=result.publicKey.toString();
      $("walletBtn").textContent=walletAddress.slice(0,4)+"…"+walletAddress.slice(-4);
      toast("Wallet connected. No transaction was signed.");
    }catch(e){toast("Wallet connection cancelled.");}
  });
  $("copyAddress").addEventListener("click",async()=>{
    if(!cfg.tokenMint){toast("Token address not configured yet.");return;}
    try{await navigator.clipboard.writeText(cfg.tokenMint);toast("Token address copied.");}catch(e){toast(cfg.tokenMint);}
  });

  $("authOpen").addEventListener("click",()=>{ $("authMessage").textContent="";dialog.showModal();});
  let supabaseClient=null;
  async function initAuth(){
    if(!cfg.supabaseUrl||!cfg.supabaseAnonKey)return;
    const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";script.onload=()=>{
      if(window.supabase?.createClient){supabaseClient=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);supabaseClient.auth.getSession().then(({data})=>{if(data.session){$("authOpen").textContent="Account";}});}
    };document.head.appendChild(script);
  }
  async function authAction(kind){
    const email=$("authEmail").value.trim(),password=$("authPassword").value;
    if(!cfg.supabaseUrl||!cfg.supabaseAnonKey){$("authMessage").textContent="Setup required: configure Supabase URL and anon key in config.js, then run the SQL in supabase/schema.sql. No account was created.";return;}
    if(!supabaseClient){$("authMessage").textContent="Auth is loading. Please try again in a moment.";return;}
    try{
      let result;
      if(kind==="signup")result=await supabaseClient.auth.signUp({email,password});
      else result=await supabaseClient.auth.signInWithPassword({email,password});
      if(result.error)throw result.error;
      $("authMessage").textContent=kind==="signup"?"Signup request sent. Check your email if confirmation is enabled.":"Signed in successfully.";
      if(kind==="signin"&&result.data.session)$("authOpen").textContent="Account";
    }catch(e){$("authMessage").textContent=e.message||"Authentication failed.";}
  }
  $("authForm").addEventListener("submit",e=>{e.preventDefault();authAction("signin");});
  $("signUpBtn").addEventListener("click",()=>authAction("signup"));
  initAuth(); applyLinks(); loadMarket();
  if(cfg.tokenMint)setInterval(loadMarket,60000);
})();
