export type TokenInfo = {
    symbol: string;
    address: string;   // 1inch uses EVM token addresses; for native ETH use "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
    decimals: number;
    name?: string;
  };
  
  export const CHAIN_IDS = {
    BASE_SEPOLIA: Number(import.meta.env.VITE_CHAIN_ID_BASE_SEPOLIA || 84532),
    BASE_MAINNET: Number(import.meta.env.VITE_CHAIN_ID_BASE_MAINNET || 8453)   // https://mainnet.base.org
  };
  
  export const TOKENS_BY_CHAIN: Record<number, Record<string, TokenInfo>> = {
    // Base Sepolia (i.e. Base testnet on Sepolia)
    [CHAIN_IDS.BASE_SEPOLIA]: {
      ETH: {
        symbol: "ETH",
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        decimals: 18
      },
      WETH: {
        symbol: "WETH",
        // Verified Base docs say WETH9 on Base testnet = 0x4200000000000000000000000000000000000006 :contentReference[oaicite:0]{index=0}
        address: import.meta.env.VITE_WETH_ADDRESS_SEPOLIA || "0x4200000000000000000000000000000000000006",
        decimals: 18
      },
      USDC: {
        symbol: "USDC",
        // For Base (not Ethereum) mainnet, USDC is 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 :contentReference[oaicite:1]{index=1}  
        // But for Base Sepolia (testnet), you'd need the testnet USDC – the docs call it “testnet Address 0x03...CF7e” :contentReference[oaicite:2]{index=2}  
        address: import.meta.env.VITE_USDC_ADDRESS_SEPOLIA || "0x03…CF7e",  // replace with full testnet USDC address
        decimals: 6
      }
    },
  
    // Base Mainnet
    [CHAIN_IDS.BASE_MAINNET]: {
      ETH: {
        symbol: "ETH",
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        decimals: 18
      },
      WETH: {
        symbol: "WETH",
        // On Base’s mainnet, WETH is also 0x4200000000000000000000000000000000000006 per Base docs :contentReference[oaicite:3]{index=3}
        address: import.meta.env.VITE_WETH_ADDRESS_MAINNET || "0x4200000000000000000000000000000000000006",
        decimals: 18
      },
      USDC: {
        symbol: "USDC",
        // For USDC on Base mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 :contentReference[oaicite:4]{index=4}
        address: import.meta.env.VITE_USDC_ADDRESS_MAINNET || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        decimals: 6
      }
    }
  };
  
  