"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serialize = void 0;
const serialize_1 = require("./serialize");
function serialize(schema, value) {
    const serializer = new serialize_1.BorshSerializer();
    return serializer.encode(value, schema);
}
exports.serialize = serialize;
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
