"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BorshDeserializer = void 0;
const types_1 = require("./types");
const buffer_1 = require("./buffer");
const bn_js_1 = __importDefault(require("bn.js"));
class BorshDeserializer {
    buffer;
    constructor(bufferArray) {
        this.buffer = new buffer_1.DecodeBuffer(bufferArray);
    }
    decode(schema, classType) {
        if (typeof schema === 'string') {
            if (types_1.numbers.includes(schema))
                return this.decode_integer(schema);
            if (schema === 'string')
                return this.decode_string();
            if (schema === 'bool')
                return this.decode_boolean();
        }
        if (typeof schema === 'object') {
            if ('option' in schema)
                return this.decode_option(schema);
            if ('array' in schema)
                return this.decode_array(schema);
            if ('set' in schema)
                return this.decode_set(schema);
            if ('map' in schema)
                return this.decode_map(schema);
            if ('struct' in schema)
                return this.decode_struct(schema, classType);
        }
        throw new Error(`Unsupported type: ${schema}`);
    }
    decode_integer(schema) {
        const size = parseInt(schema.substring(1));
        if (size <= 32 || schema == 'f64') {
            return this.buffer.consume_value(schema);
        }
        return this.decode_bigint(size);
    }
    decode_bigint(size) {
        const buffer_len = size / 8;
        const buffer = new Uint8Array(this.buffer.consume_bytes(buffer_len));
        const value = new bn_js_1.default(buffer, 'le');
        if (value.testn(buffer_len * 8 - 1)) {
            // negative number
            const buffer = value.toArray('le', buffer_len + 1);
            let carry = 1;
            for (let i = 0; i < buffer_len; i++) {
                const v = (buffer[i] ^ 0xff) + carry;
                buffer[i] = v & 0xff;
                carry = v >> 8;
            }
            return new bn_js_1.default(buffer, 'le').mul(new bn_js_1.default(-1));
        }
        return value;
    }
    decode_string() {
        const len = this.decode_integer('u32');
        const buffer = new Uint8Array(this.buffer.consume_bytes(len));
        return String.fromCharCode.apply(null, buffer);
    }
    decode_boolean() {
        return this.buffer.consume_value('u8') > 0;
    }
    decode_option(schema) {
        const option = this.buffer.consume_value('u8');
        if (option === 1) {
            return this.decode(schema.option);
        }
        if (option !== 0) {
            throw new Error(`Invalid option ${option}`);
        }
        return null;
    }
    decode_array(schema) {
        const result = [];
        const len = schema.array.len ? schema.array.len : this.decode_integer('u32');
        for (let i = 0; i < len; ++i) {
            result.push(this.decode(schema.array.type));
        }
        return result;
    }
    decode_set(schema) {
        const len = this.decode_integer('u32');
        const result = new Set();
        for (let i = 0; i < len; ++i) {
            result.add(this.decode(schema.set));
        }
        return result;
    }
    decode_map(schema) {
        const len = this.decode_integer('u32');
        const result = new Map();
        for (let i = 0; i < len; ++i) {
            const key = this.decode(schema.map.key);
            const value = this.decode(schema.map.value);
            result.set(key, value);
        }
        return result;
    }
    decode_struct(schema, classType) {
        const result = {};
        for (const key in schema.struct) {
            result[key] = this.decode(schema.struct[key]);
        }
        return classType ? new classType(result) : result;
    }
}
exports.BorshDeserializer = BorshDeserializer;
