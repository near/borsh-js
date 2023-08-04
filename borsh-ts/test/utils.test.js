const utils = require('../../lib/cjs/utils');

test('accept valid schemes', async () => {
    const array = { array: { type: 'u8' } };
    const arrayFixed = { array: { type: 'u8', len: 2 } };
    const set = { set: 'u8' };
    const map = { map: { key: 'u8', value: 'u8' } };
    const option = { option: 'u8' };
    const struct = { struct: { u8: 'u8' } };
    const enumeration = { enum: [{ struct: { irrational: 'f32' } }, { struct: { rational: { struct: { num: 'u8', den: 'u8' } } } }] };

    const valid = [
        array, arrayFixed, set, map, option, enumeration, struct,
        'u8', 'u16', 'u32', 'u64', 'u128', 'i8', 'i16', 'i32',
        'i64', 'i128', 'bool', 'string', 'f32', 'f64'
    ];

    for (const schema of valid) {
        expect(() => utils.validate_schema(schema)).not.toThrow();
    }
});

test('rejects invalid schemes', async () => {
    const array = { array: 'u8' };
    const arrayFixed = { array: { len: 2 } };
    const set = { set: { type: 'u8' } };
    const map = { map: { value: 'u8' } };
    const option = { option: null };
    const struct = { struct: arrayFixed };
    const enumeration = { enum: [ { struct: { num: 'u8', den: 'u8' } } ] };
    const noStruct = { u8: 'u8' };

    expect(() => utils.validate_schema(array)).toThrow('Invalid schema: "u8" expected { type, len? }');
    expect(() => utils.validate_schema(arrayFixed)).toThrow('Invalid schema: {"len":2} expected { type, len? }');
    expect(() => utils.validate_schema(set)).toThrow('Invalid schema: {"type":"u8"} expected option, enum, array, set, map, struct or u8, u16, u32, u64, u128, i8, i16, i32, i64, i128, f32, f64, bool, string');
    expect(() => utils.validate_schema(map)).toThrow('Invalid schema: {"value":"u8"} expected { key, value }');
    expect(() => utils.validate_schema(option)).toThrow('Invalid schema: null expected option, enum, array, set, map, struct or u8, u16, u32, u64, u128, i8, i16, i32, i64, i128, f32, f64, bool, string');
    expect(() => utils.validate_schema(enumeration)).toThrow('The "struct" in each enum must have a single key');
    expect(() => utils.validate_schema(struct)).toThrow('Invalid schema: {"len":2} expected option, enum, array, set, map, struct or u8, u16, u32, u64, u128, i8, i16, i32, i64, i128, f32, f64, bool, string');
    expect(() => utils.validate_schema(noStruct)).toThrow('Invalid schema: {"u8":"u8"} expected option, enum, array, set, map, struct or u8, u16, u32, u64, u128, i8, i16, i32, i64, i128, f32, f64, bool, string');
    expect(() => utils.validate_schema('u7')).toThrow('Invalid schema: "u7" expected option, enum, array, set, map, struct or u8, u16, u32, u64, u128, i8, i16, i32, i64, i128, f32, f64, bool, string');
    expect(() => utils.validate_schema(Array)).toThrow();
    expect(() => utils.validate_schema(Map)).toThrow();
});
