export const SolverBoardABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_solverRegistry",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "_batchSettlement",
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
                "internalType": "uint256",
                "name": "batchId",
                "type": "uint256"
            }
        ],
        "name": "BatchAlreadyExpired",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "batchId",
                "type": "uint256"
            }
        ],
        "name": "BatchAlreadySettled",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "batchId",
                "type": "uint256"
            }
        ],
        "name": "BatchValueNotSet",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "batchId",
                "type": "uint256"
            }
        ],
        "name": "BiddingClosed",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "batchId",
                "type": "uint256"
            }
        ],
        "name": "BiddingNotClosed",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "batchId",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "solver",
                "type": "address"
            }
        ],
        "name": "DuplicateBid",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "provided",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "required",
                "type": "uint256"
            }
        ],
        "name": "InsufficientSurplus",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "InvalidRouteHash",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "batchId",
                "type": "uint256"
            }
        ],
        "name": "NoValidBids",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "NotWinnerSelector",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "solver",
                "type": "address"
            }
        ],
        "name": "NotWinningSolver",
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
        "inputs": [],
        "name": "ReentrancyGuardReentrantCall",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "batchId",
                "type": "uint256"
            }
        ],
        "name": "SettlementDeadlinePassed",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "solver",
                "type": "address"
            }
        ],
        "name": "SolverNotEligible",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "batchId",
                "type": "uint256"
            }
        ],
        "name": "WinnerSelectionTooEarly",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "batchId",
                "type": "uint256"
            }
        ],
        "name": "BatchExpired",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "batchId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "finalizedBlock",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "biddingDeadline",
                "type": "uint256"
            }
        ],
        "name": "BatchPublished",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "batchId",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "solver",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "surplus",
                "type": "uint256"
            }
        ],
        "name": "BidSubmitted",
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
                "name": "batchId",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "solver",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "bool",
                "name": "success",
                "type": "bool"
            }
        ],
        "name": "SettlementExecuted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "batchId",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "solver",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "reason",
                "type": "string"
            }
        ],
        "name": "SettlementFailed",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "failure",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "expiry",
                "type": "uint256"
            }
        ],
        "name": "SlashAmountsUpdated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "keeper",
                "type": "address"
            }
        ],
        "name": "WinnerKeeperSet",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "batchId",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "solver",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "surplus",
                "type": "uint256"
            }
        ],
        "name": "WinnerSelected",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "BIDDING_WINDOW_BLOCKS",
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
        "name": "MIN_SURPLUS_BPS",
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
        "name": "SETTLEMENT_WINDOW_BLOCKS",
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
        "name": "WINNER_SELECTION_BUFFER_BLOCKS",
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
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "batchBidders",
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
        "name": "batchSettlement",
        "outputs": [
            {
                "internalType": "contract GhostLockBatchSettlement",
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
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "batches",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "batchId",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "finalizedBlock",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "biddingDeadline",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "settlementDeadline",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "winningSolver",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "winningBid",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "settled",
                "type": "bool"
            },
            {
                "internalType": "bool",
                "name": "expired",
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
                "name": "",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "bids",
        "outputs": [
            {
                "internalType": "address",
                "name": "solver",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "totalSurplus",
                "type": "uint256"
            },
            {
                "internalType": "bytes32",
                "name": "routeHash",
                "type": "bytes32"
            },
            {
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "executed",
                "type": "bool"
            },
            {
                "internalType": "bool",
                "name": "slashed",
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
                "name": "batchId",
                "type": "uint256"
            },
            {
                "internalType": "bytes",
                "name": "routes",
                "type": "bytes"
            }
        ],
        "name": "executeSettlement",
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
        "name": "expireBatch",
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
        "name": "getBatch",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "batchId",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "finalizedBlock",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "biddingDeadline",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "settlementDeadline",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "winningSolver",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "winningBid",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bool",
                        "name": "settled",
                        "type": "bool"
                    },
                    {
                        "internalType": "bool",
                        "name": "expired",
                        "type": "bool"
                    }
                ],
                "internalType": "struct SolverBoard.Batch",
                "name": "",
                "type": "tuple"
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
            }
        ],
        "name": "getBatchBidders",
        "outputs": [
            {
                "internalType": "address[]",
                "name": "",
                "type": "address[]"
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
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "hasBid",
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
                "name": "batchId",
                "type": "uint256"
            }
        ],
        "name": "isBiddingOpen",
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
                "name": "batchId",
                "type": "uint256"
            }
        ],
        "name": "publishBatch",
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
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "registerBatchValue",
        "outputs": [],
        "stateMutability": "nonpayable",
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
        "inputs": [
            {
                "internalType": "uint256",
                "name": "batchId",
                "type": "uint256"
            }
        ],
        "name": "selectWinner",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "failure",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "expiry",
                "type": "uint256"
            }
        ],
        "name": "setSlashAmounts",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "k",
                "type": "address"
            }
        ],
        "name": "setWinnerKeeper",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "slashAmountExpiry",
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
        "name": "slashAmountFailure",
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
        "name": "solverRegistry",
        "outputs": [
            {
                "internalType": "contract SolverRegistry",
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
                "name": "totalSurplus",
                "type": "uint256"
            },
            {
                "internalType": "bytes32",
                "name": "routeHash",
                "type": "bytes32"
            }
        ],
        "name": "submitBid",
        "outputs": [],
        "stateMutability": "nonpayable",
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
        "inputs": [],
        "name": "winnerKeeper",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;