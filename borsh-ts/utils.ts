import BN from 'bn.js';

export function isArrayLike(value: unknown): boolean {
    // source: https://stackoverflow.com/questions/24048547/checking-if-an-object-is-array-like
    return (
        Array.isArray(value) ||
        (!!value &&
            typeof value === 'object' &&
            'length' in value &&
            typeof (value.length) === 'number' &&
            (value.length === 0 ||
                (value.length > 0 &&
                    (value.length - 1) in value)
            )
        )
    );
}

export function expect_type(value: unknown, type: string): void {
    if (typeof (value) !== type) {
        throw new Error(`Expected ${type} not ${typeof (value)}(${value})`);
    }
}

export function expect_BN(value: unknown): void {
    if (!(value instanceof BN)) {
        throw new Error(`Expected BN not ${typeof (value)}(${value})`);
    }
}

export function expect_same_size(length: number, expected: number): void {
    if (length !== expected) {
        throw new Error(`Array length ${length} does not match schema length ${expected}`);
    }
}