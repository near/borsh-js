import { Schema } from './types';
import { BorshSerializer } from './serialize';
import { BorshDeserializer } from './deserialize';
import * as utils from './utils';

export { Schema } from './types';

export function serialize(schema: Schema, value: unknown, validate = true): Uint8Array {
    if (validate) utils.validate_schema(schema);
    const serializer = new BorshSerializer(validate);
    return serializer.encode(value, schema);
}

export function deserialize<T>(schema: Schema, buffer: Uint8Array, validate = true): T {
    if (validate) utils.validate_schema(schema);
    const deserializer = new BorshDeserializer(buffer);
    return deserializer.decode(schema) as T;
}