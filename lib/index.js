"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseDecode = exports.baseEncode = exports.deserialize = exports.serialize = void 0;
const serialize_1 = require("./serialize");
const deserialize_1 = require("./deserialize");
const utils = __importStar(require("./utils"));
const bs58_1 = __importDefault(require("bs58"));
function serialize(schema, value, checkSchema = true) {
    if (checkSchema)
        utils.validate_schema(schema);
    const serializer = new serialize_1.BorshSerializer();
    return serializer.encode(value, schema);
}
exports.serialize = serialize;
function deserialize(schema, buffer, checkSchema = true) {
    if (checkSchema)
        utils.validate_schema(schema);
    const deserializer = new deserialize_1.BorshDeserializer(buffer);
    return deserializer.decode(schema);
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
