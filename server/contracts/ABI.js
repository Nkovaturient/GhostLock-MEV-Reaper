const GHOSTLOCK_INTENTS_ABI = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "blocklockSender",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "sender",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "Funded",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			}
		],
		"name": "IntentReady",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint32",
				"name": "unlockBlock",
				"type": "uint32"
			}
		],
		"name": "IntentSubmitted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "subscriptionId",
				"type": "uint256"
			}
		],
		"name": "NewSubscriptionId",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			}
		],
		"name": "OwnershipTransferRequested",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "Received",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "recipient",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "Withdrawn",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "acceptOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "blocklock",
		"outputs": [
			{
				"internalType": "contract IBlocklockSender",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "createSubscriptionAndFundNative",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "fundContractNative",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "intents",
		"outputs": [
			{
				"internalType": "address",
				"name": "requestedBy",
				"type": "address"
			},
			{
				"internalType": "uint32",
				"name": "encryptedAt",
				"type": "uint32"
			},
			{
				"internalType": "uint32",
				"name": "unlockBlock",
				"type": "uint32"
			},
			{
				"components": [
					{
						"components": [
							{
								"internalType": "uint256[2]",
								"name": "x",
								"type": "uint256[2]"
							},
							{
								"internalType": "uint256[2]",
								"name": "y",
								"type": "uint256[2]"
							}
						],
						"internalType": "struct BLS.PointG2",
						"name": "u",
						"type": "tuple"
					},
					{
						"internalType": "bytes",
						"name": "v",
						"type": "bytes"
					},
					{
						"internalType": "bytes",
						"name": "w",
						"type": "bytes"
					}
				],
				"internalType": "struct TypesLib.Ciphertext",
				"name": "ct",
				"type": "tuple"
			},
			{
				"internalType": "bool",
				"name": "ready",
				"type": "bool"
			},
			{
				"internalType": "bytes",
				"name": "decrypted",
				"type": "bytes"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			}
		],
		"name": "isInFlight",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "lastRequestId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "subId",
				"type": "uint256"
			}
		],
		"name": "pendingRequestExists",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			},
			{
				"internalType": "bytes",
				"name": "decryptionKey",
				"type": "bytes"
			}
		],
		"name": "receiveBlocklock",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_blocklock",
				"type": "address"
			}
		],
		"name": "setBlocklock",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "subId",
				"type": "uint256"
			}
		],
		"name": "setSubId",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint32",
				"name": "callbackGasLimit",
				"type": "uint32"
			},
			{
				"internalType": "uint32",
				"name": "unlockBlock",
				"type": "uint32"
			},
			{
				"internalType": "bytes",
				"name": "condition",
				"type": "bytes"
			},
			{
				"components": [
					{
						"components": [
							{
								"internalType": "uint256[2]",
								"name": "x",
								"type": "uint256[2]"
							},
							{
								"internalType": "uint256[2]",
								"name": "y",
								"type": "uint256[2]"
							}
						],
						"internalType": "struct BLS.PointG2",
						"name": "u",
						"type": "tuple"
					},
					{
						"internalType": "bytes",
						"name": "v",
						"type": "bytes"
					},
					{
						"internalType": "bytes",
						"name": "w",
						"type": "bytes"
					}
				],
				"internalType": "struct TypesLib.Ciphertext",
				"name": "encryptedData",
				"type": "tuple"
			}
		],
		"name": "submitEncryptedIntentWithDirectFunding",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "price",
				"type": "uint256"
			}
		],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "subscriptionId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "topUpSubscriptionNative",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address[]",
				"name": "consumers",
				"type": "address[]"
			}
		],
		"name": "updateSubscription",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "recipient",
				"type": "address"
			}
		],
		"name": "withdrawNative",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	}
]

const BATCH_SETTLEMENT_ABI = [
	{
		"type": "constructor",
		"inputs": [{
			"name": "intents_",
			"type": "address",
			"internalType": "address"
		},
		{
			"name": "rng_",
			"type": "address",
			"internalType": "address"
		}],
		"stateMutability": "nonpayable"
	},
	{
		"type": "function",
		"name": "addMarket",
		"inputs": [{
			"name": "marketId",
			"type": "uint8",
			"internalType": "uint8"
		},
		{ "name": "base", "type": "address", "internalType": "contract IERC20" },
		{ "name": "quote", "type": "address", "internalType": "contract IERC20" }],
		"outputs": [], "stateMutability": "nonpayable"
	},
	{
		"type": "function",
		"name": "deposit",
		"inputs":
			[{ "name": "marketId", "type": "uint8", "internalType": "uint8" },
			{ "name": "baseAmt", "type": "uint256", "internalType": "uint256" },
			{ "name": "quoteAmt", "type": "uint256", "internalType": "uint256" }],
		"outputs": [], "stateMutability": "nonpayable"
	},
	{ "type": "function", "name": "deposits",
	"inputs": [{ "name": "", "type": "address", "internalType": "address" },
	{ "name": "", "type": "uint8", "internalType": "uint8" }],
	"outputs": [{ "name": "base", "type": "uint256", "internalType": "uint256" },
	 { "name": "quote", "type": "uint256", "internalType": "uint256" }],
	  "stateMutability": "view" }, { "type": "function", "name": "intents", "inputs": [],
	 "outputs": [{ "name": "", "type": "address", "internalType": "contract IGhostLockIntents" }],
	 "stateMutability": "view" }, { "type": "function", "name": "markets",
	 "inputs": [{ "name": "", "type": "uint8", "internalType": "uint8" }],
	 "outputs": [{ "name": "base", "type": "address", "internalType": "contract IERC20" },
	 { "name": "quote", "type": "address", "internalType": "contract IERC20" },
	 { "name": "exists", "type": "bool", "internalType": "bool" }],
	 "stateMutability": "view" }, { "type": "function", "name": "rng", "inputs": [],
	 "outputs": [{ "name": "", "type": "address", "internalType": "contract IEpochRNG" }],
	 "stateMutability": "view" }, { "type": "function", "name": "settleBatch",
	 "inputs": [{ "name": "requestIds", "type": "uint256[]", "internalType": "uint256[]" },
	 { "name": "epoch", "type": "uint256", "internalType": "uint256" },
	 { "name": "marketId", "type": "uint8", "internalType": "uint8" },
	 { "name": "clearingPrice", "type": "uint256", "internalType": "uint256" }],
	 "outputs": [], "stateMutability": "nonpayable" }, { "type": "function", "name": "settledIntent",
	 "inputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
	 "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
	 "stateMutability": "view" }, { "type": "function", "name": "withdraw",
	 "inputs": [{ "name": "marketId", "type": "uint8", "internalType": "uint8" },
	 { "name": "baseAmt", "type": "uint256", "internalType": "uint256" },
	 { "name": "quoteAmt", "type": "uint256", "internalType": "uint256" }],
	 "outputs": [], "stateMutability": "nonpayable" },
	 { "type": "event", "name": "Deposited", 
    "inputs": [{ "name": "user", "type": "address", "indexed": true, "internalType": "address" },
  { "name": "marketId", "type": "uint8", "indexed": false, "internalType": "uint8" },
  { "name": "baseAmt", "type": "uint256", "indexed": false, "internalType": "uint256" },
	 { "name": "quoteAmt", "type": "uint256", "indexed": false, "internalType": "uint256" }],
    "anonymous": false }, { "type": "event", "name": "MarketAdded", 
  "inputs": [{ "name": "marketId", "type": "uint8", "indexed": false, "internalType": "uint8" },
  { "name": "base", "type": "address", "indexed": false, "internalType": "address" },
	{ "name": "quote", "type": "address", "indexed": false, "internalType": "address" }],
   "anonymous": false }, { "type": "event", "name": "Settled", 
  "inputs": [{ "name": "epoch", "type": "uint256", "indexed": false, "internalType": "uint256" }, 
  { "name": "marketId", "type": "uint8", "indexed": false, "internalType": "uint8" }, 
{ "name": "clearingPrice", "type": "uint256", "indexed": false, "internalType": "uint256" }, 

{ "name": "buyFill", "type": "uint256", "indexed": false, "internalType": "uint256" }, 
{ "name": "sellFill", "type": "uint256", "indexed": false, "internalType": "uint256" }], 
"anonymous": false }, { "type": "error", "name": "ReentrancyGuardReentrantCall", "inputs": [] }, 
{ "type": "error", "name": "SafeERC20FailedOperation", 
  "inputs": [{ "name": "token", "type": "address", "internalType": "address" }] 
}
]


const EPOCH_RNG_ABI = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "randomnessSender",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "epoch",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			}
		],
		"name": "EpochRequested",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "epoch",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "bytes32",
				"name": "seed",
				"type": "bytes32"
			}
		],
		"name": "EpochSeed",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "sender",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "Funded",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "subscriptionId",
				"type": "uint256"
			}
		],
		"name": "NewSubscriptionId",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			}
		],
		"name": "OwnershipTransferRequested",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "Received",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "recipient",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "Withdrawn",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "acceptOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "createSubscriptionAndFundNative",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "epochSeed",
		"outputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			}
		],
		"name": "isInFlight",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "lastEpoch",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "lastRequestId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "subId",
				"type": "uint256"
			}
		],
		"name": "pendingRequestExists",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "randomnessSender",
		"outputs": [
			{
				"internalType": "contract IRandomnessSender",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "requestID",
				"type": "uint256"
			},
			{
				"internalType": "bytes32",
				"name": "randomness",
				"type": "bytes32"
			}
		],
		"name": "receiveRandomness",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "epoch",
				"type": "uint256"
			},
			{
				"internalType": "uint32",
				"name": "callbackGasLimit",
				"type": "uint32"
			}
		],
		"name": "requestEpochSeed",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_randomnessSender",
				"type": "address"
			}
		],
		"name": "setRandomnessSender",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "subId",
				"type": "uint256"
			}
		],
		"name": "setSubId",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "subscriptionId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "topUpSubscriptionNative",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address[]",
				"name": "consumers",
				"type": "address[]"
			}
		],
		"name": "updateSubscription",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]

const ERC20_ABI = [
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "n",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "s",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "supply",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "allowance",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "needed",
				"type": "uint256"
			}
		],
		"name": "ERC20InsufficientAllowance",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "sender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "balance",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "needed",
				"type": "uint256"
			}
		],
		"name": "ERC20InsufficientBalance",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "approver",
				"type": "address"
			}
		],
		"name": "ERC20InvalidApprover",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "receiver",
				"type": "address"
			}
		],
		"name": "ERC20InvalidReceiver",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "sender",
				"type": "address"
			}
		],
		"name": "ERC20InvalidSender",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			}
		],
		"name": "ERC20InvalidSpender",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "spender",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "Approval",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "Transfer",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			}
		],
		"name": "allowance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "approve",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "balanceOf",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "decimals",
		"outputs": [
			{
				"internalType": "uint8",
				"name": "",
				"type": "uint8"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "name",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "symbol",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "totalSupply",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "transfer",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "transferFrom",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]

module.exports = { GHOSTLOCK_INTENTS_ABI, BATCH_SETTLEMENT_ABI, EPOCH_RNG_ABI, ERC20_ABI };
