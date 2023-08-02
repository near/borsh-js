import { Schema, DecodeTypes } from './types.js';
export { Schema } from './types';
export declare function serialize(schema: Schema, value: unknown, checkSchema?: boolean): Uint8Array;
export declare function deserialize(schema: Schema, buffer: Uint8Array, checkSchema?: boolean): DecodeTypes;
