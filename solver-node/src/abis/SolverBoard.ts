export const SolverBoardAbi = [
  'event BatchPublished(uint256 indexed batchId, uint256 finalizedBlock, uint256 biddingDeadline)',
  'event WinnerSelected(uint256 indexed batchId, address indexed solver, uint256 surplus)',
  'event BidSubmitted(uint256 indexed batchId, address indexed solver, uint256 surplus)',
  'event SettlementExecuted(uint256 indexed batchId, address indexed solver, bool success)',
  'function submitBid(uint256 batchId, uint256 totalSurplus, bytes32 routeHash) external',
  'function executeSettlement(uint256 batchId, bytes calldata routes) external',
  'function isBiddingOpen(uint256 batchId) external view returns (bool)',
  'function getBatch(uint256 batchId) external view returns (tuple(uint256 batchId, uint256 finalizedBlock, uint256 biddingDeadline, uint256 settlementDeadline, address winningSolver, uint256 winningBid, bool settled, bool expired))',
] as const
