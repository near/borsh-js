const borsh = require('../../lib/index');
const BN = require('bn.js');

function check_decode(expected, schema, buffer) {
    const decoded = borsh.deserialize(schema, buffer);

    if (expected && typeof (expected) === 'object' && 'eq' in expected) {
        return expect(expected.eq(decoded)).toBe(true);
    }

    if (schema === 'f32') return expect(decoded).toBeCloseTo(expected);

    expect(JSON.stringify(decoded)).toEqual(JSON.stringify(expected));
}

test('deserialize integers', async () => {
    check_decode(100, 'u8', [100]);
    check_decode(258, 'u16', [2, 1]);
    check_decode(102, 'u32', [102, 0, 0, 0]);
    check_decode(new BN(103), 'u64', [103, 0, 0, 0, 0, 0, 0, 0]);
    check_decode(new BN(104), 'u128', [104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    check_decode(-100, 'i8', [156]);
    check_decode(-258, 'i16', [254, 254]);
    check_decode(-102, 'i32', [154, 255, 255, 255]);
    check_decode(new BN(-103), 'i64', [153, 255, 255, 255, 255, 255, 255, 255]);
    check_decode(new BN(-104), 'i128', [152, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]);
});

test('deserialize booleans', async () => {
    check_decode(true, 'bool', [1]);
    check_decode(false, 'bool', [0]);
});

test('deserialize strings', async () => {
    check_decode('h"i', 'string', [3, 0, 0, 0, 104, 34, 105]);
});

test('deserialize floats', async () => {
    check_decode(7.23, 'f64', [236, 81, 184, 30, 133, 235, 28, 64]);
    check_decode(7.23, 'f32', [41, 92, 231, 64]);
    check_decode(10e2, 'f32', [0, 0, 122, 68]);
    check_decode(10e2, 'f64', [0, 0, 0, 0, 0, 64, 143, 64]);
});

test('deserialize arrays', async () => {
    check_decode([true, false], { array: { type: 'bool' } }, [2, 0, 0, 0, 1, 0]);
    check_decode([true, false], { array: { type: 'bool', len: 2 } }, [1, 0]);
    check_decode([0, 0], { array: { type: 'u8' } }, [2, 0, 0, 0, 0, 0]);
    check_decode([1, 2, 3], { array: { type: 'u8', len: 3 } }, [1, 2, 3]);
});

test('deserialize options', async () => {
    check_decode(null, { option: 'u8' }, [0]);
    check_decode(1, { option: 'u32' }, [1, 1, 0, 0, 0]);
});

test('deserialize maps', async () => {
    check_decode(new Map(), { map: { key: 'u8', value: 'u8' } }, [0, 0, 0, 0]);

    const map = new Map();
    map.set('testing', 1);
    check_decode(map, { map: { key: 'string', value: 'u32' } }, [1, 0, 0, 0, 7, 0, 0, 0, 116, 101, 115, 116, 105, 110, 103, 1, 0, 0, 0]);
});

test('deserialize sets', async () => {
    check_decode(new Set(), { set: 'u8' }, [0, 0, 0, 0]);
    check_decode(new Set([1, 2]), { set: 'u8' }, [2, 0, 0, 0, 1, 2]);
});

test('serialize struct', async () => {
    check_decode(Numbers, numberSchema, expectedNumbers);

    const schemaOpt = {
        struct: {
            u32: { option: 'u32' }, option: { option: 'string' }, u8: { option: 'u8' }
        }
    };
    check_decode(Options, schemaOpt, [1, 2, 0, 0, 0, 0, 1, 1]);

    check_decode(Mixture, mixtureSchema, expectedMixture);
});

test('serialize enums', async () => {
    const enumSchema = { enum: [{ struct: { numbers: numberSchema }}, { struct: { mixture: mixtureSchema } }] };
    check_decode(MyEnumNumbers, enumSchema, [0].concat(expectedNumbers));
    check_decode(MyEnumMixture, enumSchema, [1].concat(expectedMixture));
});

test('serializes big structs', async () => {
    const schema = {
        struct: {
            u64: 'u64',
            u128: 'u128',
            arr: { array: { type: 'u8', len: 254 } }
        }
    };

    const buffer = (Array(24).fill(255)).concat([...Array(254).keys()]);

    check_decode(BigStruct, schema, buffer);
});

test('serializes nested structs', async () => {
    const Nested = {
        a: { sa: { n: 1 } },
        b: 2,
        c: 3,
    };
    
    const schema = {
        struct: { a: { struct: { sa: { struct: { n: 'u8' } } } }, b: 'u8', c: 'u8' } 
    };

    const buffer = [1, 2, 3];
    check_decode(Nested, schema, buffer);
});

// Complex number structure
const Numbers = {
    u8: 1,
    u16: 2,
    u32: 3,
    u64: new BN(4),
    u128: new BN(5),
    i8: -1,
    i16: -2,
    i32: -3,
    i64: new BN(-4),
    f32: 6.0,
    f64: 7.1,
};

const numberSchema = {
    struct: {
        u8: 'u8', u16: 'u16', u32: 'u32', u64: 'u64', u128: 'u128', i8: 'i8', i16: 'i16', i32: 'i32', i64: 'i64', f32: 'f32', f64: 'f64'
    }
};

const expectedNumbers = [1, 2, 0, 3, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 254, 255, 253, 255, 255, 255, 252, 255, 255, 255, 255, 255, 255, 255, 0, 0, 192, 64, 102, 102, 102, 102, 102, 102, 28, 64];

// Options
const Options = {
    u32: 2,
    option: null,
    u8: 1,
};

// Complex mixture of types
const Mixture = {
    foo: 321,
    bar: 123,
    u64Val: new BN('4294967297'),
    i64Val: new BN(-64),
    flag: true,
    baz: 'testing',
    uint8array: [240, 241],
    arr: [['testing'], ['testing']],
    u32Arr: [21, 11],
    i32Arr: [],
    u128Val: new BN(128),
    uint8arrays: [[240, 241], [240, 241]],
    u64Arr: [new BN('10000000000'), new BN('100000000000')],
};

const mixtureSchema = {
    struct: {
        foo: 'u32',
        bar: 'i32',
        u64Val: 'u64',
        i64Val: 'i64',
        flag: 'bool',
        baz: 'string',
        uint8array: { array: { type: 'u8', len: 2 } },
        arr: { array: { type: { array: { type: 'string' } } } },
        u32Arr: { array: { type: 'u32' } },
        i32Arr: { array: { type: 'i32' } },
        u128Val: 'u128',
        uint8arrays: { array: { type: { array: { type: 'u8', len: 2 } } } },
        u64Arr: { array: { type: 'u64' } },
    }
};

// computed by hand              i32,          u32,                 u64val,                                 i64val, B,
const expectedMixture = [65, 1, 0, 0, 123, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 192, 255, 255, 255, 255, 255, 255, 255, 1,
    //                                     string,  u8array,        
    7, 0, 0, 0, 116, 101, 115, 116, 105, 110, 103, 240, 241,
    // Array<Array<string>>
    2, 0, 0, 0, 1, 0, 0, 0, 7, 0, 0, 0, 116, 101, 115, 116, 105, 110, 103, 1, 0, 0, 0, 7, 0, 0, 0, 116, 101, 115, 116, 105, 110, 103,
    //                            u32Arr,     i32Arr,                                             u128,
    2, 0, 0, 0, 21, 0, 0, 0, 11, 0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //           Array<Uint8Array>,                                                            // u64Arr
    2, 0, 0, 0, 240, 241, 240, 241, 2, 0, 0, 0, 0, 228, 11, 84, 2, 0, 0, 0, 0, 232, 118, 72, 23, 0, 0, 0];

// A structure of big nums
const BigStruct = {
    u64: new BN('ffffffffffffffff', 'hex'),
    u128: new BN('ffffffffffffffff'.repeat(2), 'hex'),
    arr: [...Array(254).keys()],
};

const MyEnumNumbers = {
    numbers: Numbers
};

const MyEnumMixture = {
    mixture: Mixture
};