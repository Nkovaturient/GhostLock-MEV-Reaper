export const GhostLockLivenessABI = [
    {
        "type": "constructor",
        "inputs": [
            {
                "name": "_blocklockSender",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_treasury",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "receive",
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "BOND_MINIMUM",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "DRAND_QUICKNET_GENESIS",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "DRAND_QUICKNET_PERIOD",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "TLOCK_REQUEST_ID_BASE",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "acceptAdmin",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "acceptOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "admin",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "blocklock",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract IBlocklockSender"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "bountyPercent",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "claimPendingRefund",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "createSubscriptionAndFundNative",
        "inputs": [],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "forceReveal",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "decryptionKey",
                "type": "bytes",
                "internalType": "bytes"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "getBalance",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getRequestIds",
        "inputs": [
            {
                "name": "user",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256[]",
                "internalType": "uint256[]"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "intents",
        "inputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "requestedBy",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "encryptedAt",
                "type": "uint32",
                "internalType": "uint32"
            },
            {
                "name": "unlockBlock",
                "type": "uint32",
                "internalType": "uint32"
            },
            {
                "name": "ct",
                "type": "tuple",
                "internalType": "struct TypesLib.Ciphertext",
                "components": [
                    {
                        "name": "u",
                        "type": "tuple",
                        "internalType": "struct BLS.PointG2",
                        "components": [
                            {
                                "name": "x",
                                "type": "uint256[2]",
                                "internalType": "uint256[2]"
                            },
                            {
                                "name": "y",
                                "type": "uint256[2]",
                                "internalType": "uint256[2]"
                            }
                        ]
                    },
                    {
                        "name": "v",
                        "type": "bytes",
                        "internalType": "bytes"
                    },
                    {
                        "name": "w",
                        "type": "bytes",
                        "internalType": "bytes"
                    }
                ]
            },
            {
                "name": "tlockCiphertext",
                "type": "bytes",
                "internalType": "bytes"
            },
            {
                "name": "isTlock",
                "type": "bool",
                "internalType": "bool"
            },
            {
                "name": "unlockRound",
                "type": "uint32",
                "internalType": "uint32"
            },
            {
                "name": "ready",
                "type": "bool",
                "internalType": "bool"
            },
            {
                "name": "forced",
                "type": "bool",
                "internalType": "bool"
            },
            {
                "name": "decryptedHash",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "bond",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "revealDeadline",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "slashDeadline",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "isInFlight",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "isReady",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "lastRequestIdByUser",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "nextTlockRequestId",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "owner",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "pendingAdmin",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "pendingRefunds",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "pendingRequestExists",
        "inputs": [
            {
                "name": "subId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "receiveBlocklock",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "decryptionKey",
                "type": "bytes",
                "internalType": "bytes"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "revealGraceBlocks",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "revealTlockPlaintext",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "plaintext",
                "type": "bytes",
                "internalType": "bytes"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setBlocklock",
        "inputs": [
            {
                "name": "_blocklock",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setSubId",
        "inputs": [
            {
                "name": "subId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "slashBlocks",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "slashBond",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "submitIntentWithBond",
        "inputs": [
            {
                "name": "callbackGasLimit",
                "type": "uint32",
                "internalType": "uint32"
            },
            {
                "name": "unlockBlock",
                "type": "uint32",
                "internalType": "uint32"
            },
            {
                "name": "condition",
                "type": "bytes",
                "internalType": "bytes"
            },
            {
                "name": "encryptedData",
                "type": "tuple",
                "internalType": "struct TypesLib.Ciphertext",
                "components": [
                    {
                        "name": "u",
                        "type": "tuple",
                        "internalType": "struct BLS.PointG2",
                        "components": [
                            {
                                "name": "x",
                                "type": "uint256[2]",
                                "internalType": "uint256[2]"
                            },
                            {
                                "name": "y",
                                "type": "uint256[2]",
                                "internalType": "uint256[2]"
                            }
                        ]
                    },
                    {
                        "name": "v",
                        "type": "bytes",
                        "internalType": "bytes"
                    },
                    {
                        "name": "w",
                        "type": "bytes",
                        "internalType": "bytes"
                    }
                ]
            }
        ],
        "outputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "requestPrice",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "submitTlockIntentWithBond",
        "inputs": [
            {
                "name": "unlockRound",
                "type": "uint32",
                "internalType": "uint32"
            },
            {
                "name": "tlockCiphertext",
                "type": "bytes",
                "internalType": "bytes"
            }
        ],
        "outputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "subscriptionId",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "sweepEth",
        "inputs": [
            {
                "name": "to",
                "type": "address",
                "internalType": "address payable"
            },
            {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "topUpSubscriptionNative",
        "inputs": [],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "transferAdmin",
        "inputs": [
            {
                "name": "newAdmin",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "transferOwnership",
        "inputs": [
            {
                "name": "to",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "treasury",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "unlockRoundTime",
        "inputs": [
            {
                "name": "round",
                "type": "uint32",
                "internalType": "uint32"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "pure"
    },
    {
        "type": "function",
        "name": "updateConfig",
        "inputs": [
            {
                "name": "_bountyPercent",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_revealGraceBlocks",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_slashBlocks",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_treasury",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "updateSubscription",
        "inputs": [
            {
                "name": "consumers",
                "type": "address[]",
                "internalType": "address[]"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "userRequestIds",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "verifyPlaintext",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "plaintext",
                "type": "bytes",
                "internalType": "bytes"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "event",
        "name": "AdminTransferInitiated",
        "inputs": [
            {
                "name": "newAdmin",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "AdminTransferred",
        "inputs": [
            {
                "name": "oldAdmin",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "newAdmin",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "ConfigUpdated",
        "inputs": [
            {
                "name": "bountyPercent",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "revealGraceBlocks",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "slashBlocks",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "EthSwept",
        "inputs": [
            {
                "name": "to",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Funded",
        "inputs": [
            {
                "name": "sender",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "IntentBondSlashed",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "indexed": true,
                "internalType": "uint256"
            },
            {
                "name": "amount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "to",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "IntentDecrypted",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "indexed": true,
                "internalType": "uint256"
            },
            {
                "name": "marketId",
                "type": "uint8",
                "indexed": true,
                "internalType": "uint8"
            },
            {
                "name": "epoch",
                "type": "uint256",
                "indexed": true,
                "internalType": "uint256"
            },
            {
                "name": "forced",
                "type": "bool",
                "indexed": false,
                "internalType": "bool"
            },
            {
                "name": "revealer",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            },
            {
                "name": "plaintext",
                "type": "bytes",
                "indexed": false,
                "internalType": "bytes"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "IntentSubmitted",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "indexed": true,
                "internalType": "uint256"
            },
            {
                "name": "user",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "unlockBlock",
                "type": "uint32",
                "indexed": false,
                "internalType": "uint32"
            },
            {
                "name": "bond",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "NewSubscriptionId",
        "inputs": [
            {
                "name": "subscriptionId",
                "type": "uint256",
                "indexed": true,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "OwnershipTransferRequested",
        "inputs": [
            {
                "name": "from",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "to",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "OwnershipTransferred",
        "inputs": [
            {
                "name": "from",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "to",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "PendingRefundClaimed",
        "inputs": [
            {
                "name": "account",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "PendingRefundCredited",
        "inputs": [
            {
                "name": "account",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Received",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            },
            {
                "name": "",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Withdrawn",
        "inputs": [
            {
                "name": "recipient",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "AlreadyReady",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "BondTooSmall",
        "inputs": [
            {
                "name": "sent",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "minimum",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "NoBond",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "NotBlocklockIntent",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "NotTlockIntent",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "OnlyAdmin",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PlaintextHashMismatch",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "ReentrancyGuardReentrantCall",
        "inputs": []
    },
    {
        "type": "error",
        "name": "RevealTooEarly",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "currentTime",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "unlockTime",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "RevealWindowExpired",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "RevealWindowNotOpen",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "currentBlock",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "revealDeadline",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "SlashNotAllowed",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "UnknownRequest",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    }
] as const
