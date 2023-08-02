import { Schema, DecodeTypes } from './types.js';
import { BorshSerializer } from './serialize.js';
import { BorshDeserializer } from './deserialize.js';
import * as utils from './utils.js';

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