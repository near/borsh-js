/// <reference types="node" />
declare const bs58: {
    encode: (source: any) => any;
    decodeUnsafe: (source: any) => "" | Buffer;
    decode: (string: any) => string | Buffer;
};
export default bs58;
