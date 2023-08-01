const borsh = require('borsh-js');

const encodedU16 = borsh.serialize('u16', 2);
const decodedU16 = borsh.deserialize('u16', encodedU16);
console.log(decodedU16);

const encodedStr = borsh.serialize('string', 'testing');
const decodedStr = borsh.deserialize('string', encodedStr);
console.log(decodedStr);
