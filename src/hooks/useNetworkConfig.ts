import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { CONFIG } from "../lib/config";

export const CHAIN_ID_TO_ADDRESS = {
    "84532": CONFIG.CONTRACTS.GHOSTLOCK_INTENTS, // Base Sepolia
    "8453": CONFIG.BASE_MAINNET.GHOSTLOCK_INTENTS, // Base Mainnet
    "42161": CONFIG.ARBITRUM.GHOSTLOCK_INTENTS, // Arbitrum One
    "421614": CONFIG.ARBITRUM_SEPOLIA.GHOSTLOCK_INTENTS, // Arbitrum Sepolia
};

export const CHAIN_ID_TO_EPOCH_RNG = {
    "84532": CONFIG.CONTRACTS.EPOCH_RNG, // Base Sepolia
    "8453": CONFIG.BASE_MAINNET.EPOCH_RNG, // Base Mainnet
    "42161": CONFIG.ARBITRUM.EPOCH_RNG, // Arbitrum One
    "421614": CONFIG.ARBITRUM_SEPOLIA.EPOCH_RNG, // Arbitrum Sepolia
};

export const CHAIN_ID_BLOCK_TIME = {
    "84532": 2, // Base Sepolia: ~2 seconds per block
    "8453": 2, // Base Mainnet: ~2 seconds per block
    "42161": 0.25, // Arbitrum One: ~0.25 seconds per block
    "421614": 0.25, // Arbitrum Sepolia: ~0.25 seconds per block
};

export const CHAIN_ID_GAS_CONFIG = {
    "84532": {
        gasLimit: 100_000,
        maxFeePerGas: ethers.parseUnits("0.2", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("0.2", "gwei"),
        gasBufferPercent: 100,
        callbackGasLimitDefault: 1_000_000,
        gasMultiplierDefault: 10,
        blocklockAddress: "0x82Fed730CbdeC5A2D8724F2e3b316a70A565e27e",
    },
    "8453": {
        gasLimit: 100_000,
        maxFeePerGas: ethers.parseUnits("0.2", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("0.2", "gwei"),
        gasBufferPercent: 100,
        callbackGasLimitDefault: 1_000_000,
        gasMultiplierDefault: 10,
        blocklockAddress: "0x82Fed730CbdeC5A2D8724F2e3b316a70A565e27e",
    },
    "42161": {
        gasLimit: 100_000,
        maxFeePerGas: ethers.parseUnits("0.1", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("0.1", "gwei"),
        gasBufferPercent: 100,
        callbackGasLimitDefault: 1_000_000,
        gasMultiplierDefault: 10,
        blocklockAddress: "0x78ebbbc39f7244bE80C76f11248f5a2645978e25",
    },
    "421614": {
        gasLimit: 100_000,
        maxFeePerGas: ethers.parseUnits("0.1", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("0.1", "gwei"),
        gasBufferPercent: 100,
        callbackGasLimitDefault: 1_000_000,
        gasMultiplierDefault: 10,
        blocklockAddress: "0x78ebbbc39f7244bE80C76f11248f5a2645978e25",
    },
};

export const useNetworkConfig = () => {
    const { chainId, address } = useAccount();
    const availableChains = Object.keys(CHAIN_ID_TO_ADDRESS);

    if (chainId && !availableChains.includes(chainId.toString())) {
        console.warn(`Chain ${chainId} not supported. Available chains: ${availableChains.join(", ")}`);
    }

    return {
        CONTRACT_ADDRESS:
            CHAIN_ID_TO_ADDRESS[
            chainId?.toString() as keyof typeof CHAIN_ID_TO_ADDRESS
            ],
        EPOCH_RNG_ADDRESS:
            CHAIN_ID_TO_EPOCH_RNG[
            chainId?.toString() as keyof typeof CHAIN_ID_TO_EPOCH_RNG
            ],
        secondsPerBlock:
            CHAIN_ID_BLOCK_TIME[
            chainId?.toString() as keyof typeof CHAIN_ID_BLOCK_TIME
            ],
        gasConfig:
            CHAIN_ID_GAS_CONFIG[
            chainId?.toString() as keyof typeof CHAIN_ID_GAS_CONFIG
            ],
        chainId: chainId?.toString(),
        isSupported: chainId ? availableChains.includes(chainId.toString()) : false,
    };
};
