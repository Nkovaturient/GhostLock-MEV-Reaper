const EpochRNGABI = [
    {
        "type": "constructor",
        "inputs": [
            {
                "name": "beacon_",
                "type": "address",
                "internalType": "contract DrandBeacon"
            },
            {
                "name": "epochAnchor_",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "roundAnchor_",
                "type": "uint64",
                "internalType": "uint64"
            },
            {
                "name": "roundsPerEpoch_",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "beacon",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract DrandBeacon"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "epochAnchor",
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
        "name": "epochSeed",
        "inputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getEpochSeed",
        "inputs": [
            {
                "name": "epoch",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "seed",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "roundAnchor",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "roundForEpoch",
        "inputs": [
            {
                "name": "epoch",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "roundsPerEpoch",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "seedEpoch",
        "inputs": [
            {
                "name": "epoch",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "seed",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "seedEpochWithSignature",
        "inputs": [
            {
                "name": "epoch",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "sigX",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "sigY",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "seed",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "event",
        "name": "EpochSeedReceived",
        "inputs": [
            {
                "name": "epoch",
                "type": "uint256",
                "indexed": true,
                "internalType": "uint256"
            },
            {
                "name": "seed",
                "type": "bytes32",
                "indexed": false,
                "internalType": "bytes32"
            }
        ],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "EpochBeforeAnchor",
        "inputs": [
            {
                "name": "epoch",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "anchor",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "EpochReserved",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidAnchor",
        "inputs": []
    },
    {
        "type": "error",
        "name": "SeedAlreadyExists",
        "inputs": [
            {
                "name": "epoch",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "SeedNotAvailable",
        "inputs": [
            {
                "name": "epoch",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    }
];

module.exports = { EpochRNGABI };
