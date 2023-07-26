import { Schema, DecodeTypes } from './types';
export { Schema } from './types';
export declare function serialize(schema: Schema, value: unknown): Uint8Array;
export declare function deserialize(schema: Schema, buffer: Uint8Array): DecodeTypes;
export declare function baseEncode(value: Uint8Array | string): string;
export declare function baseDecode(value: string): Uint8Array;
