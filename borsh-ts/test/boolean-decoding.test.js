const borsh = require('../../lib/cjs/index');

describe('canonical boolean decoding', () => {
    test.each(Array.from({ length: 254 }, (_, index) => index + 2))(
        'rejects invalid boolean byte %i',
        (value) => {
            expect(() => borsh.deserialize('bool', Uint8Array.of(value)))
                .toThrow(`Invalid boolean value: ${value}`);
        },
    );

    test.each([[0, false], [1, true]])('round-trips canonical boolean %i', (byte, value) => {
        expect(borsh.deserialize('bool', Uint8Array.of(byte))).toBe(value);
        expect(borsh.serialize('bool', value)).toEqual(Uint8Array.of(byte));
    });

    test('still checks wire values when schema validation is disabled', () => {
        expect(() => borsh.deserialize('bool', Uint8Array.of(2), false))
            .toThrow('Invalid boolean value: 2');
    });

    test('rejects non-canonical booleans nested in arrays', () => {
        const schema = { array: { type: 'bool', len: 2 } };
        expect(() => borsh.deserialize(schema, Uint8Array.of(0, 255)))
            .toThrow('Invalid boolean value: 255');
    });

    test('preserves neighboring struct fields for valid booleans', () => {
        const schema = { struct: { before: 'u8', flag: 'bool', after: 'u16' } };
        expect(borsh.deserialize(schema, Uint8Array.of(7, 1, 0x34, 0x12)))
            .toEqual({ before: 7, flag: true, after: 0x1234 });
    });

    test('continues to reject truncated input', () => {
        expect(() => borsh.deserialize('bool', new Uint8Array()))
            .toThrow('the buffer is smaller than expected');
    });
});
