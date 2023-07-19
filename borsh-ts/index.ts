import { Schema } from './types';
import {BorshSerializer} from './serialize';

export function serialize(schema: Schema, value: unknown): Uint8Array {
    const serializer = new BorshSerializer();
    return serializer.encode(value, schema);
}


// export function serialize(
//     schema: Schema,
//     obj: any,
// ): Uint8Array {
//     const writer = new Writer();
//     serializeStruct(schema, obj, writer);
//     return writer.toArray();
// }

// export function deserialize<T>(
//     schema: Schema,
//     classType: { new(args: any): T },
//     buffer: Buffer,
// ): T {
//     const reader = new Reader(buffer);
//     return deserializeStruct(schema, classType, reader);
// }
