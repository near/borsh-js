"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseDecode = exports.baseEncode = exports.deserialize = exports.serialize = void 0;
const serialize_1 = require("./serialize");
const deserialize_1 = require("./deserialize");
const bs58_1 = __importDefault(require("bs58"));
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
// Keeping this for compatibility reasons with the old borsh-js
function baseEncode(value) {
    if (typeof value === 'string') {
        // create a uint8array from string decoding utf-8 without using Buffer
        value = new Uint8Array([...value].map((c) => c.charCodeAt(0)));
    }
    return bs58_1.default.encode(value);
}
exports.baseEncode = baseEncode;
function baseDecode(value) {
    return new Uint8Array(bs58_1.default.decode(value));
}
exports.baseDecode = baseDecode;
