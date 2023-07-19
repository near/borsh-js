const borsh = require('../../lib/index');
const BN = require('bn.js');

function check_encode(value, schema, expected) {
    const encoded = borsh.serialize(schema, value);
    expect(encoded).toEqual(Uint8Array.from(expected));
}

test('serialize integers', async () => {
    check_encode(100, 'u8', [100]);
    check_encode(258, 'u16', [2, 1]);
    check_encode(102, 'u32', [102, 0, 0, 0]);
    check_encode(new BN(103), 'u64', [103, 0, 0, 0, 0, 0, 0, 0]);
    check_encode(new BN(104), 'u128', [104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    check_encode(-100, 'i8', [156]);
    check_encode(-258, 'i16', [254, 254]);
    check_encode(-102, 'i32', [154, 255, 255, 255]);
    check_encode(new BN(-103), 'i64', [153, 255, 255, 255, 255, 255, 255, 255]);
    check_encode(new BN(-104), 'i128', [152, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]);
});

test('serialize booleans', async () => {
    check_encode(true, 'bool', [1]);
    check_encode(false, 'bool', [0]);
});

test('serialize strings', async () => {
    check_encode('h"i', 'string', [3, 0, 0, 0, 104, 34, 105]);
});

test('serialize floats', async () => {
    check_encode(7.23, 'f64', [236, 81, 184, 30, 133, 235, 28, 64]);
    check_encode(7.23, 'f32', [41, 92, 231, 64]);
    check_encode(10e2, 'f32', [0, 0, 122, 68]);
    check_encode(10e2, 'f64', [0, 0, 0, 0, 0, 64, 143, 64]);
});

test('serialize arrays', async () => {
    check_encode([true, false], { array: { type: 'bool' } }, [2, 0, 0, 0, 1, 0]);
    check_encode([true, false], { array: { type: 'bool', len: 2 } }, [1, 0]);
    check_encode(new ArrayBuffer(2), { array: { type: 'u8' } }, [2, 0, 0, 0, 0, 0]);
    check_encode(new ArrayBuffer(2), { array: { type: 'u8', len: 2 } }, [0, 0]);
});

test('serialize options', async () => {
    check_encode(null, { option: 'u8' }, [0]);
    check_encode(1, { option: 'u32' }, [1, 1, 0, 0, 0]);
});

test('serialize maps', async () => {
    check_encode(new Map(), { map: { key: 'u8', value: 'u8' } }, [0, 0, 0, 0]);
    check_encode({ 'a': 1, 'b': 2 }, { map: { key: 'string', value: 'u8' } }, [2, 0, 0, 0, 1, 0, 0, 0, 97, 1, 1, 0, 0, 0, 98, 2]);

    const map = new Map();
    map.set('testing', 1);
    check_encode(map, { map: { key: 'string', value: 'u32' } }, [1, 0, 0, 0, 7, 0, 0, 0, 116, 101, 115, 116, 105, 110, 103, 1, 0, 0, 0]);
});

test('serialize sets', async () => {
    check_encode(new Set(), { set: 'u8' }, [0, 0, 0, 0]);
    check_encode(new Set([1, 2]), { set: 'u8' }, [2, 0, 0, 0, 1, 2]);
});

test('serialize struct', async () => {
    const numbers = new Numbers();
    const schema = {
        struct: {
            u8: 'u8', u16: 'u16', u32: 'u32', u64: 'u64', u128: 'u128', i8: 'i8', i16: 'i16', i32: 'i32', i64: 'i64', i128: 'i128', f32: 'f32', f64: 'f64'
        }
    };
    check_encode(numbers, schema, [1, 2, 0, 3, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 254, 255, 253, 255, 255, 255, 252, 255, 255, 255, 255, 255, 255, 255, 0, 0, 192, 64, 102, 102, 102, 102, 102, 102, 28, 64]);

});



// Aux structures
class Numbers {
    u8 = 1;
    u16 = 2;
    u32 = 3;
    u64 = new BN(4);
    u128 = new BN(5);
    i8 = -1;
    i16 = -2;
    i32 = -3;
    i64 = new BN(-4);
    f32 = 6.0;
    f64 = 7.1;
}