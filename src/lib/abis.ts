// Contract ABIs for GhostLock (drand EpochRNG + helpers)

export const EPOCH_RNG_ABI = [
	{
		"type": "function",
		"name": "beacon",
		"inputs": [],
		"outputs": [{ "name": "", "type": "address", "internalType": "contract DrandBeacon" }],
		"stateMutability": "view"
	},
	{
		"type": "function",
		"name": "epochAnchor",
		"inputs": [],
		"outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
		"stateMutability": "view"
	},
	{
		"type": "function",
		"name": "epochSeed",
		"inputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
		"outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
		"stateMutability": "view"
	},
	{
		"type": "function",
		"name": "getEpochSeed",
		"inputs": [{ "name": "epoch", "type": "uint256", "internalType": "uint256" }],
		"outputs": [{ "name": "seed", "type": "bytes32", "internalType": "bytes32" }],
		"stateMutability": "view"
	},
	{
		"type": "function",
		"name": "roundAnchor",
		"inputs": [],
		"outputs": [{ "name": "", "type": "uint64", "internalType": "uint64" }],
		"stateMutability": "view"
	},
	{
		"type": "function",
		"name": "roundForEpoch",
		"inputs": [{ "name": "epoch", "type": "uint256", "internalType": "uint256" }],
		"outputs": [{ "name": "", "type": "uint64", "internalType": "uint64" }],
		"stateMutability": "view"
	},
	{
		"type": "function",
		"name": "roundsPerEpoch",
		"inputs": [],
		"outputs": [{ "name": "", "type": "uint64", "internalType": "uint64" }],
		"stateMutability": "view"
	},
	{
		"type": "function",
		"name": "seedEpoch",
		"inputs": [{ "name": "epoch", "type": "uint256", "internalType": "uint256" }],
		"outputs": [{ "name": "seed", "type": "bytes32", "internalType": "bytes32" }],
		"stateMutability": "nonpayable"
	},
	{
		"type": "function",
		"name": "seedEpochWithSignature",
		"inputs": [
			{ "name": "epoch", "type": "uint256", "internalType": "uint256" },
			{ "name": "sigX", "type": "uint256", "internalType": "uint256" },
			{ "name": "sigY", "type": "uint256", "internalType": "uint256" }
		],
		"outputs": [{ "name": "seed", "type": "bytes32", "internalType": "bytes32" }],
		"stateMutability": "nonpayable"
	},
	{
		"type": "event",
		"name": "EpochSeedReceived",
		"inputs": [
			{ "name": "epoch", "type": "uint256", "indexed": true, "internalType": "uint256" },
			{ "name": "seed", "type": "bytes32", "indexed": false, "internalType": "bytes32" }
		],
		"anonymous": false
	}
] as const

export const DRAND_BEACON_ABI = [
	{
		"type": "function",
		"name": "randomnessOf",
		"inputs": [{ "name": "", "type": "uint64", "internalType": "uint64" }],
		"outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
		"stateMutability": "view"
	},
	{
		"type": "function",
		"name": "relay",
		"inputs": [
			{ "name": "round", "type": "uint64", "internalType": "uint64" },
			{ "name": "sigX", "type": "uint256", "internalType": "uint256" },
			{ "name": "sigY", "type": "uint256", "internalType": "uint256" }
		],
		"outputs": [{ "name": "randomness", "type": "bytes32", "internalType": "bytes32" }],
		"stateMutability": "nonpayable"
	},
	{
		"type": "function",
		"name": "timeOfRound",
		"inputs": [{ "name": "round", "type": "uint64", "internalType": "uint64" }],
		"outputs": [{ "name": "", "type": "uint64", "internalType": "uint64" }],
		"stateMutability": "pure"
	},
	{
		"type": "event",
		"name": "BeaconRelayed",
		"inputs": [
			{ "name": "round", "type": "uint64", "indexed": true, "internalType": "uint64" },
			{ "name": "randomness", "type": "bytes32", "indexed": false, "internalType": "bytes32" },
			{ "name": "relayer", "type": "address", "indexed": false, "internalType": "address" }
		],
		"anonymous": false
	}
] as const

export const ERC20_ABI = [
	{
		"inputs": [
			{ "internalType": "string", "name": "n", "type": "string" },
			{ "internalType": "string", "name": "s", "type": "string" },
			{ "internalType": "uint256", "name": "supply", "type": "uint256" }
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{ "internalType": "address", "name": "spender", "type": "address" },
			{ "internalType": "uint256", "name": "allowance", "type": "uint256" },
			{ "internalType": "uint256", "name": "needed", "type": "uint256" }
		],
		"name": "ERC20InsufficientAllowance",
		"type": "error"
	},
	{
		"inputs": [
			{ "internalType": "address", "name": "sender", "type": "address" },
			{ "internalType": "uint256", "name": "balance", "type": "uint256" },
			{ "internalType": "uint256", "name": "needed", "type": "uint256" }
		],
		"name": "ERC20InsufficientBalance",
		"type": "error"
	},
	{
		"inputs": [{ "internalType": "address", "name": "approver", "type": "address" }],
		"name": "ERC20InvalidApprover",
		"type": "error"
	},
	{
		"inputs": [{ "internalType": "address", "name": "receiver", "type": "address" }],
		"name": "ERC20InvalidReceiver",
		"type": "error"
	},
	{
		"inputs": [{ "internalType": "address", "name": "sender", "type": "address" }],
		"name": "ERC20InvalidSender",
		"type": "error"
	},
	{
		"inputs": [{ "internalType": "address", "name": "spender", "type": "address" }],
		"name": "ERC20InvalidSpender",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
			{ "indexed": true, "internalType": "address", "name": "spender", "type": "address" },
			{ "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
		],
		"name": "Approval",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{ "indexed": true, "internalType": "address", "name": "from", "type": "address" },
			{ "indexed": true, "internalType": "address", "name": "to", "type": "address" },
			{ "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
		],
		"name": "Transfer",
		"type": "event"
	},
	{
		"inputs": [
			{ "internalType": "address", "name": "owner", "type": "address" },
			{ "internalType": "address", "name": "spender", "type": "address" }
		],
		"name": "allowance",
		"outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{ "internalType": "address", "name": "spender", "type": "address" },
			{ "internalType": "uint256", "name": "value", "type": "uint256" }
		],
		"name": "approve",
		"outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
		"name": "balanceOf",
		"outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "decimals",
		"outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "name",
		"outputs": [{ "internalType": "string", "name": "", "type": "string" }],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "symbol",
		"outputs": [{ "internalType": "string", "name": "", "type": "string" }],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "totalSupply",
		"outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{ "internalType": "address", "name": "to", "type": "address" },
			{ "internalType": "uint256", "name": "value", "type": "uint256" }
		],
		"name": "transfer",
		"outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{ "internalType": "address", "name": "from", "type": "address" },
			{ "internalType": "address", "name": "to", "type": "address" },
			{ "internalType": "uint256", "name": "value", "type": "uint256" }
		],
		"name": "transferFrom",
		"outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
		"stateMutability": "nonpayable",
		"type": "function"
	}
] as const
