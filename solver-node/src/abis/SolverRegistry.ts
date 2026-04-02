export const SolverRegistryAbi = [
  'function registerSolver(string calldata endpointUrl) external payable',
  'function isEligibleSolver(address solver) external view returns (bool)',
  'function getActiveSolvers() external view returns (address[])',
] as const
