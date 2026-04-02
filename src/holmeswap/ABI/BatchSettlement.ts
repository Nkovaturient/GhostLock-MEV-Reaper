export const BatchSettlementABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_liveness",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "_rng",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "_oracle",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "_owner",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "internalType": "uint8",
                "name": "marketId",
                "type": "uint8"
            }
        ],
        "name": "DepositCapExceeded",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "EmptyBatch",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "buysRemaining",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "sellsRemaining",
                "type": "uint256"
            }
        ],
        "name": "ImbalanceTooLarge",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "requestId",
                "type": "uint256"
            }
        ],
        "name": "IntentAlreadySettled",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "requestId",
                "type": "uint256"
            }
        ],
        "name": "IntentNotReady",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint8",
                "name": "marketId",
                "type": "uint8"
            }
        ],
        "name": "MarketAlreadyExists",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint8",
                "name": "marketId",
                "type": "uint8"
            }
        ],
        "name": "MarketNotFound",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "epoch",
                "type": "uint256"
            }
        ],
        "name": "NoEpochSeed",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "NotSolverBoard",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            }
        ],
        "name": "OwnableInvalidOwner",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "OwnableUnauthorizedAccount",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "requestId",
                "type": "uint256"
            }
        ],
        "name": "PlaintextMismatch",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "clearingPrice",
                "type": "uint256"
            }
        ],
        "name": "PriceOutOfBounds",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "ReentrancyGuardReentrantCall",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "token",
                "type": "address"
            }
        ],
        "name": "SafeERC20FailedOperation",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint8",
                "name": "marketId",
                "type": "uint8"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "baseAmt",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "quoteAmt",
                "type": "uint256"
            }
        ],
        "name": "Deposited",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "newTolerance",
                "type": "uint256"
            }
        ],
        "name": "DustToleranceUpdated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint8",
                "name": "marketId",
                "type": "uint8"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "base",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "quote",
                "type": "address"
            }
        ],
        "name": "MarketAdded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "previousOwner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "newOwner",
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
                "indexed": true,
                "internalType": "uint256",
                "name": "epoch",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "uint8",
                "name": "marketId",
                "type": "uint8"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "clearingPrice",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "buyFillBase",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "sellFillBase",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "dustBuys",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "dustSells",
                "type": "uint256"
            }
        ],
        "name": "Settled",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "solverBoard",
                "type": "address"
            }
        ],
        "name": "SolverBoardSet",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint8",
                "name": "marketId",
                "type": "uint8"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "baseAmt",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "quoteAmt",
                "type": "uint256"
            }
        ],
        "name": "Withdrawn",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "MAX_BATCH_SIZE",
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
        "name": "MAX_DUST_TOLERANCE",
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
                "internalType": "uint8",
                "name": "marketId",
                "type": "uint8"
            },
            {
                "internalType": "contract IERC20",
                "name": "base",
                "type": "address"
            },
            {
                "internalType": "contract IERC20",
                "name": "quote",
                "type": "address"
            }
        ],
        "name": "addMarket",
        "outputs": [],
        "stateMutability": "nonpayable",
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
        "name": "batchValue",
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
                "internalType": "uint8",
                "name": "marketId",
                "type": "uint8"
            },
            {
                "internalType": "uint256",
                "name": "baseAmt",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "quoteAmt",
                "type": "uint256"
            }
        ],
        "name": "deposit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "name": "depositCapBase",
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
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "name": "depositCapQuote",
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
                "name": "",
                "type": "address"
            },
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "name": "deposits",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "base",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "quote",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "dustTolerance",
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
            },
            {
                "internalType": "bytes",
                "name": "routes",
                "type": "bytes"
            }
        ],
        "name": "executeWithRoutes",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "batchId",
                "type": "uint256"
            }
        ],
        "name": "getBatchValue",
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
        "name": "liveness",
        "outputs": [
            {
                "internalType": "contract IGhostLockLiveness",
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
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "name": "markets",
        "outputs": [
            {
                "internalType": "contract IERC20",
                "name": "base",
                "type": "address"
            },
            {
                "internalType": "contract IERC20",
                "name": "quote",
                "type": "address"
            },
            {
                "internalType": "bool",
                "name": "exists",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "oracle",
        "outputs": [
            {
                "internalType": "contract IPriceOracle",
                "name": "",
                "type": "address"
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
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "rng",
        "outputs": [
            {
                "internalType": "contract IEpochRNG",
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
                "name": "batchId",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "setBatchValue",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint8",
                "name": "marketId",
                "type": "uint8"
            },
            {
                "internalType": "uint256",
                "name": "capBase",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "capQuote",
                "type": "uint256"
            }
        ],
        "name": "setDepositCaps",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "tol",
                "type": "uint256"
            }
        ],
        "name": "setDustTolerance",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_oracle",
                "type": "address"
            }
        ],
        "name": "setOracle",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_solverBoard",
                "type": "address"
            }
        ],
        "name": "setSolverBoard",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "requestId",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bytes",
                        "name": "plaintext",
                        "type": "bytes"
                    }
                ],
                "internalType": "struct GhostLockBatchSettlement.IntentPayload[]",
                "name": "payloads",
                "type": "tuple[]"
            },
            {
                "internalType": "uint256",
                "name": "epoch",
                "type": "uint256"
            },
            {
                "internalType": "uint8",
                "name": "marketId",
                "type": "uint8"
            },
            {
                "internalType": "uint256",
                "name": "clearingPrice",
                "type": "uint256"
            }
        ],
        "name": "settleBatch",
        "outputs": [],
        "stateMutability": "nonpayable",
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
        "name": "settledIntent",
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
        "name": "solverBoard",
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
                "internalType": "address",
                "name": "newOwner",
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
                "internalType": "uint8",
                "name": "marketId",
                "type": "uint8"
            },
            {
                "internalType": "uint256",
                "name": "baseAmt",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "quoteAmt",
                "type": "uint256"
            }
        ],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;