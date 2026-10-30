# OOPS INU Hub — first working version

A responsive, static-first community website starter for OOPS INU. It deliberately does not invent market values or pretend local demo points are shared.

## Included now
- Responsive landing page and original inline SVG mascot
- Market dashboard that stays blank until a real Solana mint is configured
- Cloudflare Pages Function proxy for DEX Screener token-pairs API
- Browser-based meme generator with PNG download
- Phantom wallet connect (connect only; no transaction signing)
- Missions with clearly labelled browser-local demo points
- Optional Supabase email/password sign-in/sign-up integration
- Supabase SQL schema with Row Level Security policies
- Pump.fun link that points to the coin page once a mint address is configured

## Deploy to Cloudflare Pages
1. Upload the contents of this folder to a Git repository or use Cloudflare Pages Direct Upload.
2. Build command: leave blank. Build output directory: `/` (project root).
3. Ensure `functions/api/market.js` is included so `/api/market?mint=...` works. For best results, deploy through a connected Git repository with Cloudflare Pages Functions enabled.
4. Open the deployed URL and test the meme generator and market dashboard.

## Configure the real token
Edit `config.js` after the token has actually been created:
- `tokenMint`: the real Solana mint address
- `pumpUrl`: leave `https://pump.fun/` or set the real coin URL
- `xUrl` and `telegramUrl`: official links only

The market dashboard uses the public DEX Screener endpoint via the server-side Pages Function. If the token has no indexed market pair yet, the dashboard will continue to show no values. No fake fallback values are used.

## Enable real accounts
1. Create a project at https://supabase.com/
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. Copy the project URL and anon/public key into `config.js` as `supabaseUrl` and `supabaseAnonKey`.
4. Configure allowed site URLs and email confirmation settings in Supabase Auth.
5. Test signup and signin using a test account.

Never put a Supabase service-role key in `config.js`. Only the public anon key belongs in the browser, and Row Level Security must remain enabled.

Important: The included profile/meme/mission schema is a foundation, not a complete social backend. Persistent shared profiles, meme uploads, and a secure cross-user leaderboard still need UI/API integration and server-side validation. Demo mission points in this first version are local to the browser and are not token rewards.

## Budget
- Cloudflare Pages static hosting: start with free tier, subject to current limits.
- Supabase: start with free tier, subject to current limits.
- Domain: optional; purchase separately if desired.
- Coin launch and SOL/network fees are separate from website hosting.
- Keep a reserve; don't spend the whole €100–€300 on the first website version.

## Security and transparency
- Wallet connection does not sign or submit transactions.
- No private keys, seed phrases, or service-role keys are requested.
- No trading bots, fake volume, fake holders, or fake market metrics.
- This is not financial advice and no token value or return is promised.
