const DrandBeaconABI = [
    {
        "type": "function",
        "name": "DST",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bytes",
                "internalType": "bytes"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "GENESIS_TIME",
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
        "name": "PERIOD",
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
        "name": "getRandomness",
        "inputs": [
            {
                "name": "round",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "outputs": [
            {
                "name": "randomness",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "isValidSignature",
        "inputs": [
            {
                "name": "round",
                "type": "uint64",
                "internalType": "uint64"
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
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "messageOf",
        "inputs": [
            {
                "name": "round",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "pure"
    },
    {
        "type": "function",
        "name": "randomnessOf",
        "inputs": [
            {
                "name": "",
                "type": "uint64",
                "internalType": "uint64"
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
        "name": "relay",
        "inputs": [
            {
                "name": "round",
                "type": "uint64",
                "internalType": "uint64"
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
                "name": "randomness",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "roundAt",
        "inputs": [
            {
                "name": "timestamp",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "stateMutability": "pure"
    },
    {
        "type": "function",
        "name": "timeOfRound",
        "inputs": [
            {
                "name": "round",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "stateMutability": "pure"
    },
    {
        "type": "event",
        "name": "BeaconRelayed",
        "inputs": [
            {
                "name": "round",
                "type": "uint64",
                "indexed": true,
                "internalType": "uint64"
            },
            {
                "name": "randomness",
                "type": "bytes32",
                "indexed": false,
                "internalType": "bytes32"
            },
            {
                "name": "relayer",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "InvalidSignature",
        "inputs": [
            {
                "name": "round",
                "type": "uint64",
                "internalType": "uint64"
            }
        ]
    },
    {
        "type": "error",
        "name": "PairingCallFailed",
        "inputs": []
    },
    {
        "type": "error",
        "name": "RoundNotYetDue",
        "inputs": [
            {
                "name": "round",
                "type": "uint64",
                "internalType": "uint64"
            },
            {
                "name": "dueAt",
                "type": "uint64",
                "internalType": "uint64"
            }
        ]
    },
    {
        "type": "error",
        "name": "RoundZero",
        "inputs": []
    }
];

module.exports = { DrandBeaconABI };
