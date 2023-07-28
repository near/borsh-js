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
var serialize_1 = require("./serialize");
var deserialize_1 = require("./deserialize");
var utils = __importStar(require("./utils"));
var bs58_1 = __importDefault(require("bs58"));
function serialize(schema, value, checkSchema) {
    if (checkSchema === void 0) { checkSchema = true; }
    if (checkSchema)
        utils.validate_schema(schema);
    var serializer = new serialize_1.BorshSerializer();
    return serializer.encode(value, schema);
}
exports.serialize = serialize;
function deserialize(schema, buffer, checkSchema) {
    if (checkSchema === void 0) { checkSchema = true; }
    if (checkSchema)
        utils.validate_schema(schema);
    var deserializer = new deserialize_1.BorshDeserializer(buffer);
    return deserializer.decode(schema);
}
exports.deserialize = deserialize;
// Keeping this for compatibility reasons with the old borsh-js
function baseEncode(value) {
    if (typeof value === 'string') {
        var bytes = [];
        for (var c = 0; c < value.length; c++) {
            bytes.push(value.charCodeAt(c));
        }
        value = new Uint8Array(bytes);
    }
    return bs58_1.default.encode(value);
}
exports.baseEncode = baseEncode;
function baseDecode(value) {
    return new Uint8Array(bs58_1.default.decode(value));
}
exports.baseDecode = baseDecode;
