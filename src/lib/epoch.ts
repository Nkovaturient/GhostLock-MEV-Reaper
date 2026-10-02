import { CONFIG } from './config'

export function getCurrentEpoch(blockNumber: number): number {
  return Math.floor(blockNumber / CONFIG.AUCTION.EPOCH_DURATION_BLOCKS)
}

export function getTargetEpoch(targetBlock: number): number {
  return Math.floor(targetBlock / CONFIG.AUCTION.EPOCH_DURATION_BLOCKS)
}
