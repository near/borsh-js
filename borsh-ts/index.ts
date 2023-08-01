import { Schema, DecodeTypes } from './types.js';
import { BorshSerializer } from './serialize.js';
import { BorshDeserializer } from './deserialize.js';
import * as utils from './utils.js';
import bs58 from 'bs58';

export { Schema } from './types';

export function serialize(schema: Schema, value: unknown, checkSchema = true): Uint8Array {
    if (checkSchema) utils.validate_schema(schema);
    const serializer = new BorshSerializer();
    return serializer.encode(value, schema);
}

export function deserialize(schema: Schema, buffer: Uint8Array, checkSchema = true): DecodeTypes {
    if (checkSchema) utils.validate_schema(schema);
    const deserializer = new BorshDeserializer(buffer);
    return deserializer.decode(schema);
}

// Keeping this for compatibility reasons with the old borsh-js
export function baseEncode(value: Uint8Array | string): string {
    if (typeof value === 'string') {
        const bytes = [];
        for(let c = 0; c < value.length; c++){
            bytes.push(value.charCodeAt(c));
        }
        value = new Uint8Array(bytes);
    }
    return bs58.encode(value);
}

export function baseDecode(value: string): Uint8Array {
    return new Uint8Array(bs58.decode(value));
}
