const borsh = require('../../lib/index');

test('baseEncode string test', async () => {
    const encodedValue = borsh.baseEncode('244ZQ9cgj3CQ6bWBdytfrJMuMQ1jdXLFGnr4HhvtCTnM');
    const expectedValue = 'HKk9gqNj4xb4rLdJuzT5zzJbLa4vHBdYCxQT9H99csQh6nz3Hfpqn4jtWA92';
    expect(encodedValue).toEqual(expectedValue);
});

test('baseEncode array test', async () => {
    expect(borsh.baseEncode([1, 2, 3, 4, 5])).toEqual('7bWpTW');
});

test('baseDecode test', async () => {
    const value = 'HKk9gqNj4xb4rLdJu';
    const expectedDecodedArray = [3, 96, 254, 84, 10, 240, 93, 199, 52, 244, 164, 240, 6];
    const expectedBuffer = new Uint8Array(Buffer.from(expectedDecodedArray));
    expect(borsh.baseDecode(value)).toEqual(expectedBuffer);
});

test('base encode and decode test', async () => {
    const value = '244ZQ9cgj3CQ6bWBdytfrJMuMQ1jdXLFGnr4HhvtCTnM';
    expect(borsh.baseEncode(borsh.baseDecode(value))).toEqual(value);
});