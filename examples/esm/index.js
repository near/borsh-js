import * as borsh from 'borsh-js';

const encodedU16 = borsh.serialize('u16', 2);
const decodedU16 = borsh.deserialize('u16', encodedU16);
console.log(decodedU16);

const encodedStr = borsh.serialize('u64', '100000000000000000');
const decodedStr = borsh.deserialize('u64', encodedStr);
console.log(decodedStr);