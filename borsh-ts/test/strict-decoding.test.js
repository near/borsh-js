const borsh = require('../../lib/cjs/index');

function stringBytes(bytes) {
    return Uint8Array.from([bytes.length, 0, 0, 0, ...bytes]);
}

describe('strict UTF-8 decoding', () => {
    test.each([
        [0x80], [0xbf], [0xc0, 0x80], [0xc1, 0xbf], [0xc7, 0x46],
        [0xc2], [0xe1], [0xe1, 0x80], [0xf0], [0xf0, 0x90], [0xf0, 0x90, 0x80],
        [0xe0, 0x80, 0x80], [0xe0, 0x9f, 0xbf], [0xf0, 0x80, 0x80, 0x80],
        [0xed, 0xa0, 0x80], [0xed, 0xbf, 0xbf], [0xf4, 0x90, 0x80, 0x80],
        [0xf5, 0x80, 0x80, 0x80], [0xf8, 0x80, 0x80, 0x80, 0x80], [0xff],
        [0xe1, 0x41, 0x80], [0xe1, 0x80, 0x41],
        [0xf1, 0x41, 0x80, 0x80], [0xf1, 0x80, 0x41, 0x80], [0xf1, 0x80, 0x80, 0x41],
    ].map(bytes => [bytes]))('rejects invalid UTF-8 %j', (bytes) => {
        expect(() => borsh.deserialize('string', stringBytes(bytes)))
            .toThrow('Invalid UTF-8 string');
    });

    test.each([
        ['', []], ['\0A', [0, 65]], ['\u007f', [0x7f]], ['\u0080', [0xc2, 0x80]],
        ['\u07ff', [0xdf, 0xbf]], ['\u0800', [0xe0, 0xa0, 0x80]],
        ['\ud7ff', [0xed, 0x9f, 0xbf]], ['\ue000', [0xee, 0x80, 0x80]],
        ['\uffff', [0xef, 0xbf, 0xbf]], ['\u{10000}', [0xf0, 0x90, 0x80, 0x80]],
        ['\u{10ffff}', [0xf4, 0x8f, 0xbf, 0xbf]], ['\ufeff', [0xef, 0xbb, 0xbf]],
    ])('preserves valid Unicode text %j', (text, bytes) => {
        const encoded = stringBytes(bytes);
        expect(borsh.deserialize('string', encoded)).toBe(text);
        expect(borsh.serialize('string', text)).toEqual(encoded);
    });

    test('preserves byte boundaries after nested strings', () => {
        const schema = { struct: { text: 'string', after: 'u8' } };
        const encoded = Uint8Array.from([...stringBytes([0xf0, 0x9f, 0x91, 0x8d]), 42]);
        expect(borsh.deserialize(schema, encoded)).toEqual({ text: '👍', after: 42 });
    });
});

describe('enum bounds', () => {
    const schema = { enum: [{ struct: { first: 'u8' } }, { struct: { last: 'u16' } }] };

    test.each([2, 3, 255])('rejects unavailable enum index %i with a decode error', (index) => {
        expect(() => borsh.deserialize(schema, Uint8Array.of(index, 42)))
            .toThrow(`Enum option ${index} is not available`);
    });

    test('decodes both valid boundary variants', () => {
        expect(borsh.deserialize(schema, Uint8Array.of(0, 42))).toEqual({ first: 42 });
        expect(borsh.deserialize(schema, Uint8Array.of(1, 0x34, 0x12))).toEqual({ last: 0x1234 });
    });
});

describe('complete top-level input consumption', () => {
    test.each([
        ['u8', [1, 2]],
        ['bool', [1, 0]],
        ['string', [0, 0, 0, 0, 0]],
        [{ array: { type: 'u8', len: 2 } }, [1, 2, 3]],
        [{ option: 'u8' }, [0, 1]],
        [{ struct: { value: 'u8' } }, [1, 2]],
        [{ map: { key: 'u8', value: 'u8' } }, [0, 0, 0, 0, 1]],
    ])('rejects trailing data for %j', (schema, bytes) => {
        expect(() => borsh.deserialize(schema, Uint8Array.from(bytes)))
            .toThrow('Unexpected trailing bytes: 1');
    });

    test('does not bypass wire validation when schema validation is disabled', () => {
        expect(() => borsh.deserialize('u8', Uint8Array.of(1, 2), false))
            .toThrow('Unexpected trailing bytes: 1');
    });
});
