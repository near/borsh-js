import { Schema, DecodeTypes } from './types';
import { BorshSerializer } from './serialize';
import { BorshDeserializer } from './deserialize';
import * as utils from './utils';
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
        // create a uint8array from string decoding utf-8 without using Buffer
        value = new Uint8Array([...value].map((c) => c.charCodeAt(0)));
    }
    return bs58.encode(value);
}

export function baseDecode(value: string): Uint8Array {
    return new Uint8Array(bs58.decode(value));
}
