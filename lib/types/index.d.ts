import { Schema } from './types';
export { Schema } from './types';
export declare function serialize(schema: Schema, value: unknown, validate?: boolean): Uint8Array;
export declare function deserialize<T>(schema: Schema, buffer: Uint8Array, validate?: boolean): T;
