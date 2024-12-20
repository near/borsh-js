import * as borsh from 'borsh';

const encodedU16 = borsh.serialize('u16', 2);
const decodedU16 = borsh.deserialize('u16', encodedU16);
console.log(decodedU16);

const encodedStr = borsh.serialize('string', 'testing');
const decodedStr = borsh.deserialize('string', encodedStr);
console.log(decodedStr);

const encodedU64 = borsh.serialize('u64', '100000000000000000');
const decodedU64 = borsh.deserialize('u64', encodedU64);
console.log(decodedU64);