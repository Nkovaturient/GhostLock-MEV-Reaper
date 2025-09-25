import { TOKENS_BY_CHAIN, TokenInfo } from "./token-list";
import { ethers } from "ethers";

/**
 * Query 1inch v5 quote endpoint for a given chain
 *
 * - chainId: number (e.g., 84532 for Base Sepolia — adjust in token-list)
 * - fromSymbol/toSymbol: token symbols (ETH, USDC, WETH)
 * - amount: human amount string (e.g., "0.01")
 *
 * Returns:
 * { toTokenAmount, toTokenAmountHuman, slippageEstimate, estimatedGas }
 */
export async function getSwapQuote(chainId: number, fromSymbol: string, toSymbol: string, amountHuman: string) {
  // Resolve token info
  const chainTokens = TOKENS_BY_CHAIN[chainId];
  if (!chainTokens) throw new Error(`Unsupported chain id ${chainId} for quotes.`);

  const from = chainTokens[fromSymbol];
  const to = chainTokens[toSymbol];
  if (!from || !to) {
    throw new Error(`Token mapping missing for ${fromSymbol} or ${toSymbol} on chain ${chainId}`);
  }

  // Convert human amount to base units
  const amountUnits = ethers.parseUnits(amountHuman, from.decimals).toString();

  // 1inch quote endpoint
  const baseUrl = `https://api.1inch.io/v5.0/${chainId}/quote`;
  const url = `${baseUrl}?fromTokenAddress=${from.address}&toTokenAddress=${to.address}&amount=${amountUnits}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`1inch quote failed: ${resp.status} ${text}`);
  }
  const json = await resp.json();

  // typical fields: toTokenAmount (string), estimatedGas (number)
  const toTokenAmount = json.toTokenAmount; // raw units
  const estimatedGas = json.estimatedGas || null;

  // Convert to human readable using 'to' decimals
  const toTokenAmountHuman = ethers.formatUnits(toTokenAmount, to.decimals);

  // Slippage estimate: 1inch quote does not give slippage directly.
  // As an approximation, you can compare expected normalized price vs an external price source (optional).
  // For now, leave slippage null or calculate later from a price oracle if you provide one.
  const slippageEstimate = null;

  return {
    fromToken: from as TokenInfo,
    toToken: to as TokenInfo,
    toTokenAmount,
    toTokenAmountHuman,
    estimatedGas,
    slippageEstimate,
    raw: json
  };
}
