export const GhostLockLivenessABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_blocklockSender",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "_treasury",
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
                "name": "requestId",
                "type": "uint256"
            }
        ],
        "name": "AlreadyReady",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "sent",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "minimum",
                "type": "uint256"
            }
        ],
        "name": "BondTooSmall",
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
        "name": "NoBond",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "OnlyAdmin",
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
                "name": "requestId",
                "type": "uint256"
            }
        ],
        "name": "RevealWindowExpired",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "requestId",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "currentBlock",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "revealDeadline",
                "type": "uint256"
            }
        ],
        "name": "RevealWindowNotOpen",
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
        "name": "SlashNotAllowed",
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
        "name": "UnknownRequest",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "newAdmin",
                "type": "address"
            }
        ],
        "name": "AdminTransferInitiated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "oldAdmin",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "newAdmin",
                "type": "address"
            }
        ],
        "name": "AdminTransferred",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "bountyPercent",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "revealGraceBlocks",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "slashBlocks",
                "type": "uint256"
            }
        ],
        "name": "ConfigUpdated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "EthSwept",
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
                "name": "requestId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "to",
                "type": "address"
            }
        ],
        "name": "IntentBondSlashed",
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
                "internalType": "uint8",
                "name": "marketId",
                "type": "uint8"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "epoch",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "bool",
                "name": "forced",
                "type": "bool"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "revealer",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "bytes",
                "name": "plaintext",
                "type": "bytes"
            }
        ],
        "name": "IntentDecrypted",
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
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "bond",
                "type": "uint256"
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
                "indexed": true,
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "PendingRefundClaimed",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "PendingRefundCredited",
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
        "name": "BOND_MINIMUM",
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
        "name": "acceptAdmin",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
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
        "name": "admin",
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
        "name": "bountyPercent",
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
        "name": "claimPendingRefund",
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
                "name": "requestId",
                "type": "uint256"
            },
            {
                "internalType": "bytes",
                "name": "decryptionKey",
                "type": "bytes"
            }
        ],
        "name": "forceReveal",
        "outputs": [],
        "stateMutability": "nonpayable",
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
                "internalType": "address",
                "name": "user",
                "type": "address"
            }
        ],
        "name": "getRequestIds",
        "outputs": [
            {
                "internalType": "uint256[]",
                "name": "",
                "type": "uint256[]"
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
                "internalType": "bool",
                "name": "forced",
                "type": "bool"
            },
            {
                "internalType": "bytes32",
                "name": "decryptedHash",
                "type": "bytes32"
            },
            {
                "internalType": "uint256",
                "name": "bond",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "revealDeadline",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "slashDeadline",
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
        "inputs": [
            {
                "internalType": "uint256",
                "name": "requestId",
                "type": "uint256"
            }
        ],
        "name": "isReady",
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
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "lastRequestIdByUser",
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
        "inputs": [],
        "name": "pendingAdmin",
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
                "name": "",
                "type": "address"
            }
        ],
        "name": "pendingRefunds",
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
        "inputs": [],
        "name": "revealGraceBlocks",
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
        "inputs": [],
        "name": "slashBlocks",
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
        "name": "slashBond",
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
        "name": "submitIntentWithBond",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "requestId",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "requestPrice",
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
        "inputs": [
            {
                "internalType": "address payable",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "sweepEth",
        "outputs": [],
        "stateMutability": "nonpayable",
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
                "name": "newAdmin",
                "type": "address"
            }
        ],
        "name": "transferAdmin",
        "outputs": [],
        "stateMutability": "nonpayable",
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
        "inputs": [],
        "name": "treasury",
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
                "name": "_bountyPercent",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "_revealGraceBlocks",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "_slashBlocks",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "_treasury",
                "type": "address"
            }
        ],
        "name": "updateConfig",
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
                "internalType": "address",
                "name": "",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "userRequestIds",
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
            },
            {
                "internalType": "bytes",
                "name": "plaintext",
                "type": "bytes"
            }
        ],
        "name": "verifyPlaintext",
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
        "stateMutability": "payable",
        "type": "receive"
    }
];