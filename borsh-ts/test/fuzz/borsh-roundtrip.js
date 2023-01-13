const borsh = require('../../../lib/index.js');

const PUBLIC_KEY_SCHEMA = {
    keyType: 'u8',
    data: [32],
};

const ACCESS_KEY_SCHEMA = {
    nonce: 'u64',
    permission: {
        enum: true,
        functionCall: {
            allowance: 'u128',
            receiverId: 'string',
            methodNames: ['string'],
        },
        fullAccess: {},
    },
};

const ACTION_SCHEMA = {
    enum: true,
    createAccount: {},
    deployContract: {
        code: ['u8'],
    },
    functionCall: {
        methodName: 'string',
        args: ['u8'],
        gas: 'u64',
        deposit: 'u128',
    },
    transfer: {
        deposit: 'u128',
    },
    stake: {
        stake: 'u128',
        publicKey: PUBLIC_KEY_SCHEMA,
    },
    addKey: {
        publicKey: PUBLIC_KEY_SCHEMA,
        accessKey: ACCESS_KEY_SCHEMA,
    },
    deleteKey: {
        publicKey: PUBLIC_KEY_SCHEMA,
    },
    deleteAccount: {
        beneficiaryId: 'string',
    },
};

const TRANSACTION_SCHEMA = {
    signerId: 'string',
    publicKey: PUBLIC_KEY_SCHEMA,
    nonce: 'u64',
    receiverId: 'string',
    blockHash: [32, 'u8'],
    actions: [ACTION_SCHEMA],
}

exports.fuzz = input => {
    try {
        const deserialized = borsh.deserialize(TRANSACTION_SCHEMA, input);
        const serialized = borsh.serialize(TRANSACTION_SCHEMA, deserialized);
        if (!serialized.equals(input)) {
            console.log(`Mismatching output:\n${serialized.toString('hex')}\nand input:\n${input.toString('hex')}`);
            throw new Error('Mismatching input and output');
        }
    } catch (e) {
        if (e instanceof borsh.BorshError) {
            // Do nothing
        } else {
            throw e;
        }
    }
};