import { Schema, DecodeTypes } from './types';
import { BorshSerializer } from './serialize';
import { BorshDeserializer } from './deserialize';

export function serialize(schema: Schema, value: unknown): Uint8Array {
    const serializer = new BorshSerializer();
    return serializer.encode(value, schema);
}

export function deserialize(schema: Schema, buffer: Uint8Array, classType?: ObjectConstructor): DecodeTypes {
    const deserializer = new BorshDeserializer(buffer);
    return deserializer.decode(schema, classType);
}
