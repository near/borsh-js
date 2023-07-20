"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deserialize = exports.serialize = void 0;
const serialize_1 = require("./serialize");
const deserialize_1 = require("./deserialize");
function serialize(schema, value) {
    const serializer = new serialize_1.BorshSerializer();
    return serializer.encode(value, schema);
}
exports.serialize = serialize;
function deserialize(schema, buffer, classType) {
    const deserializer = new deserialize_1.BorshDeserializer(buffer);
    return deserializer.decode(schema, classType);
}
exports.deserialize = deserialize;
