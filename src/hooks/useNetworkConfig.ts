import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { CONFIG } from "../lib/config";

export const CHAIN_ID_TO_ADDRESS = {
    "84532": CONFIG.CONTRACTS.GHOSTLOCK_INTENTS,
};

export const CHAIN_ID_BLOCK_TIME = {
    "84532": 1,
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
};

export const useNetworkConfig = () => {
    const { chainId } = useAccount();
    const availableChains = Object.keys(CHAIN_ID_TO_ADDRESS);

    if (!chainId || !availableChains.includes(chainId.toString())) {
        console.warn("Chain not supported");
    }

    return {
        CONTRACT_ADDRESS:
            CHAIN_ID_TO_ADDRESS[
            chainId?.toString() as keyof typeof CHAIN_ID_TO_ADDRESS
            ],
        secondsPerBlock:
            CHAIN_ID_BLOCK_TIME[
            chainId?.toString() as keyof typeof CHAIN_ID_BLOCK_TIME
            ],
        gasConfig:
            CHAIN_ID_GAS_CONFIG[
            chainId?.toString() as keyof typeof CHAIN_ID_GAS_CONFIG
            ],
    };
};
