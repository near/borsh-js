const borsh = require('../../lib/index');

class Assignable {
    constructor(properties) {
        Object.keys(properties).map((key) => {
            this[key] = properties[key];
        });
    }
}

class Test extends Assignable { }

test('serialize object', async () => {
    const value = new Test({ x: 255, y: 20, z: '123', q: [1, 2, 3] });
    const schema = new Map([[Test, { kind: 'struct', fields: [['x', 'u8'], ['y', 'u64'], ['z', 'string'], ['q', [3]]] }]]);
    const buf = borsh.serialize(schema, value);
    const newValue = borsh.deserialize(schema, Test, buf);
    expect(newValue.x).toEqual(255);
    expect(newValue.y.toString()).toEqual('20');
    expect(newValue.z).toEqual('123');
    expect(newValue.q).toEqual(new Uint8Array([1, 2, 3]));
});

test('baseEncode string test', async () => {
    const encodedValue = borsh.baseEncode("244ZQ9cgj3CQ6bWBdytfrJMuMQ1jdXLFGnr4HhvtCTnM");
    const expectedValue = "HKk9gqNj4xb4rLdJuzT5zzJbLa4vHBdYCxQT9H99csQh6nz3Hfpqn4jtWA92";
    expect(encodedValue).toEqual(expectedValue);
});

test('baseEncode array test', async () => {
    expect(borsh.baseEncode([1, 2, 3, 4, 5])).toEqual('7bWpTW');
});

test('baseDecode test', async () => {
    const value = "HKk9gqNj4xb4rLdJu";
    const expectedDecodedArray = [3, 96, 254, 84, 10, 240, 93, 199, 52, 244, 164, 240, 6];
    const expectedBuffer = Buffer.from(expectedDecodedArray);
    expect(borsh.baseDecode(value)).toEqual(expectedBuffer);
});

test('base encode and decode test', async () => {
    const value = '244ZQ9cgj3CQ6bWBdytfrJMuMQ1jdXLFGnr4HhvtCTnM';
    expect(borsh.baseEncode(borsh.baseDecode(value))).toEqual(value);
});