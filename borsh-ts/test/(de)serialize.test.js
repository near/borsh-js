const borsh = require('../../lib/cjs/index');
const testStructures = require('./structures');
const BN = require('bn.js');

function check_encode(value, schema, expected) {
    const encoded = borsh.serialize(schema, value);
    expect(encoded).toEqual(Uint8Array.from(expected));
}

function check_decode(expected, schema, encoded) {
    const decoded = borsh.deserialize(schema, encoded);
    // console.log(decoded, expected); // visual inspection
    if (expected instanceof BN) return expect(BigInt(expected) === decoded).toBe(true);
    if (schema === 'f32') return expect(decoded).toBeCloseTo(expected);
    expect(decoded).toEqual(expected);
}

function check_roundtrip(value, schema, encoded) {
    check_encode(value, schema, encoded);
    check_decode(value, schema, encoded);
}

test('serialize integers', async () => {
    check_roundtrip(100, 'u8', [100]);
    check_roundtrip(258, 'u16', [2, 1]);
    check_roundtrip(102, 'u32', [102, 0, 0, 0]);
    check_roundtrip(new BN(103), 'u64', [103, 0, 0, 0, 0, 0, 0, 0]);
    check_roundtrip(104n, 'u128', [104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    check_roundtrip(-100, 'i8', [156]);
    check_roundtrip(-258, 'i16', [254, 254]);
    check_roundtrip(-102, 'i32', [154, 255, 255, 255]);
    check_roundtrip(new BN(-103n), 'i64', [153, 255, 255, 255, 255, 255, 255, 255]);
    check_roundtrip(-104n, 'i128', [152, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]);
});

test('serialize booleans', async () => {
    check_roundtrip(true, 'bool', [1]);
    check_roundtrip(false, 'bool', [0]);
});

test('serialize strings', async () => {
    check_roundtrip('h"i', 'string', [3, 0, 0, 0, 104, 34, 105]);
});

test('serialize floats', async () => {
    check_roundtrip(7.23, 'f64', [236, 81, 184, 30, 133, 235, 28, 64]);
    check_roundtrip(7.23, 'f32', [41, 92, 231, 64]);
    check_roundtrip(10e2, 'f32', [0, 0, 122, 68]);
    check_roundtrip(10e2, 'f64', [0, 0, 0, 0, 0, 64, 143, 64]);
});

test('serialize arrays', async () => {
    check_roundtrip([true, false], { array: { type: 'bool' } }, [2, 0, 0, 0, 1, 0]);
    check_roundtrip([true, false], { array: { type: 'bool', len: 2 } }, [1, 0]);
    check_encode(new ArrayBuffer(2), { array: { type: 'u8' } }, [2, 0, 0, 0, 0, 0]);

    const buffer = new ArrayBuffer(2);
    new Uint8Array(buffer).set([1, 2]);
    check_encode(buffer, { array: { type: 'u8', len: 2 } }, [1, 2]);
});

test('serialize options', async () => {
    check_roundtrip(null, { option: 'u8' }, [0]);
    check_roundtrip(1, { option: 'u32' }, [1, 1, 0, 0, 0]);
});

test('serialize maps', async () => {
    check_roundtrip(new Map(), { map: { key: 'u8', value: 'u8' } }, [0, 0, 0, 0]);

    const map = new Map();
    map.set('testing', 1);
    check_roundtrip(map, { map: { key: 'string', value: 'u32' } }, [1, 0, 0, 0, 7, 0, 0, 0, 116, 101, 115, 116, 105, 110, 103, 1, 0, 0, 0]);

    check_encode({ 'a': 1, 'b': 2 }, { map: { key: 'string', value: 'u8' } }, [2, 0, 0, 0, 1, 0, 0, 0, 97, 1, 1, 0, 0, 0, 98, 2]);
});

test('serialize sets', async () => {
    check_roundtrip(new Set(), { set: 'u8' }, [0, 0, 0, 0]);
    check_roundtrip(new Set([1, 2]), { set: 'u8' }, [2, 0, 0, 0, 1, 2]);
});

test('serialize struct', async () => {
    check_roundtrip(testStructures.Numbers, testStructures.schemaNumbers, testStructures.encodedNumbers);
    check_roundtrip(testStructures.Options, testStructures.schemaOptions, testStructures.encodedOptions);
    check_roundtrip(testStructures.Nested, testStructures.schemaNested, testStructures.encodedNested);
    check_roundtrip(testStructures.Mixture, testStructures.schemaMixture, testStructures.encodedMixture);
    check_roundtrip(testStructures.BigStruct, testStructures.schemaBigStruct, testStructures.encodedBigStruct);
});

test('serialize enums', async () => {
    const MyEnumNumbers = { numbers: testStructures.Numbers };
    const MyEnumMixture = { mixture: testStructures.Mixture };

    const enumSchema = {
        enum: [{ struct: { numbers: testStructures.schemaNumbers } }, { struct: { mixture: testStructures.schemaMixture } }]
    };

    check_roundtrip(MyEnumNumbers, enumSchema, [0].concat(testStructures.encodedNumbers));
    check_roundtrip(MyEnumMixture, enumSchema, [1].concat(testStructures.encodedMixture));
});

test('(de)serialize follows the schema order', async () => {
    const schema = {
        struct: { a: 'u8', b: 'u8' }
    };

    const object = { b: 2, a: 1 };
    const encoded = [1, 2];

    check_encode(object, schema, encoded);
    check_decode({ a: 1, b: 2 }, schema, encoded);
});

test('errors on invalid values', async () => {
    const schema_array = { array: { type: 'u16' } };

    expect(() => check_encode(['a'], schema_array, [])).toThrow('Expected number not string(a) at value');
    expect(() => check_encode(3, 'string', [])).toThrow('Expected string not number(3) at value');
    expect(() => check_encode({ 'a': 1, 'b': '2' }, { struct: { a: 'u8', b: 'u8' } }, [])).toThrow('Expected number not string(2) at value.b');
    expect(() => check_encode({ 'a': { 'b': { 'c': 3 } } }, { struct: { a: { struct: { b: { struct: { c: 'string' } } } } } }, [])).toThrow('Expected string not number(3) at value.a.b.c');
});