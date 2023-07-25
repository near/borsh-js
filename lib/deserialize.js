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
exports.BorshDeserializer = void 0;
const types_1 = require("./types");
const utils = __importStar(require("./utils"));
const buffer_1 = require("./buffer");
const bn_js_1 = __importDefault(require("bn.js"));
class BorshDeserializer {
    buffer;
    constructor(bufferArray) {
        this.buffer = new buffer_1.DecodeBuffer(bufferArray);
    }
    decode(schema) {
        utils.validate_schema(schema);
        return this.decode_value(schema);
    }
    decode_value(schema) {
        if (typeof schema === 'string') {
            if (types_1.integers.includes(schema))
                return this.decode_integer(schema);
            if (schema === 'string')
                return this.decode_string();
            if (schema === 'bool')
                return this.decode_boolean();
        }
        if (typeof schema === 'object') {
            if ('option' in schema)
                return this.decode_option(schema);
            if ('enum' in schema)
                return this.decode_enum(schema);
            if ('array' in schema)
                return this.decode_array(schema);
            if ('set' in schema)
                return this.decode_set(schema);
            if ('map' in schema)
                return this.decode_map(schema);
            if ('struct' in schema)
                return this.decode_struct(schema);
        }
        throw new Error(`Unsupported type: ${schema}`);
    }
    decode_integer(schema) {
        const size = parseInt(schema.substring(1));
        if (size <= 32 || schema == 'f64') {
            return this.buffer.consume_value(schema);
        }
        return this.decode_bigint(size, schema.startsWith('i'));
    }
    decode_bigint(size, signed = false) {
        const buffer_len = size / 8;
        const buffer = new Uint8Array(this.buffer.consume_bytes(buffer_len));
        if (signed && buffer[buffer_len - 1]) {
            // negative number
            let carry = 1;
            for (let i = 0; i < buffer_len; i++) {
                const v = (buffer[i] ^ 0xff) + carry;
                buffer[i] = v & 0xff;
                carry = v >> 8;
            }
            return new bn_js_1.default(buffer, 'le').mul(new bn_js_1.default(-1));
        }
        return new bn_js_1.default(buffer, 'le');
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
            return this.decode_value(schema.option);
        }
        if (option !== 0) {
            throw new Error(`Invalid option ${option}`);
        }
        return null;
    }
    decode_enum(schema) {
        const valueIndex = this.buffer.consume_value('u8');
        if (valueIndex > schema.enum.length) {
            throw new Error(`Enum option ${valueIndex} is not available`);
        }
        const struct = schema.enum[valueIndex].struct;
        const key = Object.keys(struct)[0];
        return { [key]: this.decode_value(struct[key]) };
    }
    decode_array(schema) {
        const result = [];
        const len = schema.array.len ? schema.array.len : this.decode_integer('u32');
        for (let i = 0; i < len; ++i) {
            result.push(this.decode_value(schema.array.type));
        }
        return result;
    }
    decode_set(schema) {
        const len = this.decode_integer('u32');
        const result = new Set();
        for (let i = 0; i < len; ++i) {
            result.add(this.decode_value(schema.set));
        }
        return result;
    }
    decode_map(schema) {
        const len = this.decode_integer('u32');
        const result = new Map();
        for (let i = 0; i < len; ++i) {
            const key = this.decode_value(schema.map.key);
            const value = this.decode_value(schema.map.value);
            result.set(key, value);
        }
        return result;
    }
    decode_struct(schema) {
        const result = {};
        for (const key in schema.struct) {
            result[key] = this.decode_value(schema.struct[key]);
        }
        return result;
    }
}
exports.BorshDeserializer = BorshDeserializer;
