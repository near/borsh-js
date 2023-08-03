import { Schema, DecodeTypes } from './types.js';
import { BorshSerializer } from './serialize.js';
import { BorshDeserializer } from './deserialize.js';
import * as utils from './utils.js';

export { Schema } from './types';

export function serialize(schema: Schema, value: unknown, validate = true): Uint8Array {
    if (validate) utils.validate_schema(schema);
    const serializer = new BorshSerializer(validate);
    return serializer.encode(value, schema);
}

export function deserialize(schema: Schema, buffer: Uint8Array, validate = true): DecodeTypes {
    if (validate) utils.validate_schema(schema);
    const deserializer = new BorshDeserializer(buffer);
    return deserializer.decode(schema);
}