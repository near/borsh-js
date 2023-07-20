const borsh = require('../../lib/index');
const BN = require('bn.js');

function check_decode(expected, schema, buffer, classType) {
    const decoded = borsh.deserialize(schema, buffer, classType);

    if (expected && typeof (expected) === 'object' && 'eq' in expected) {
        expect(expected.eq(decoded)).toBe(true);
    } else {
        if(schema === 'f32'){
            expect(decoded).toBeCloseTo(expected);
        }else{
            expect(decoded).toEqual(expected);
        }
    }
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

test('deserialize struct', async () => {
    const numbers = new Numbers();
    const schema = {
        struct: {
            u8: 'u8', u16: 'u16', u32: 'u32', u64: 'u64', u128: 'u128', i8: 'i8', i16: 'i16', i32: 'i32', i64: 'i64', f32: 'f32', f64: 'f64'
        }
    };
    check_decode(numbers, schema, [1, 2, 0, 3, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 254, 255, 253, 255, 255, 255, 252, 255, 255, 255, 255, 255, 255, 255, 0, 0, 192, 64, 102, 102, 102, 102, 102, 102, 28, 64], Numbers);

    check_decode(new Map([['a', 1], ['b', 2]]), { map: { key: 'string', value: 'u8' } }, [2, 0, 0, 0, 1, 0, 0, 0, 97, 1, 1, 0, 0, 0, 98, 2]);
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