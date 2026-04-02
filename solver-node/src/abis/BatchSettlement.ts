export const BatchSettlementAbi = [
  'function getBatchIntents(uint256 batchId) external view returns (uint256[])',
  'function getIntent(uint256 intentId) external view returns (tuple(address user, uint8 side, uint256 amount, uint256 limitPrice, uint8 marketId, uint256 epoch))',
] as const
