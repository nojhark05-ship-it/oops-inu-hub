/*
  OOPS INU HUB CONFIGURATION
  1) Set tokenMint only after OOPS INU has actually been created on Solana.
  2) Add official social URLs only after those accounts exist.
  3) Supabase settings are optional until you create a Supabase project.
*/
window.OOPS_CONFIG = {
  tokenMint: "", // Real Solana mint address; leave blank until launch.
  pumpUrl: "https://pump.fun/",
  xUrl: "",      // Example: https://x.com/your_official_account
  telegramUrl: "",
  supabaseUrl: "",
  supabaseAnonKey: ""
};
