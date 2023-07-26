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
exports.BorshSerializer = void 0;
const types_1 = require("./types");
const buffer_1 = require("./buffer");
const bn_js_1 = __importDefault(require("bn.js"));
const utils = __importStar(require("./utils"));
class BorshSerializer {
    encoded = new buffer_1.EncodeBuffer();
    encode(value, schema) {
        utils.validate_schema(schema);
        this.encode_value(value, schema);
        return this.encoded.get_used_buffer();
    }
    encode_value(value, schema) {
        if (typeof schema === 'string') {
            if (types_1.integers.includes(schema))
                return this.encode_integer(value, schema);
            if (schema === 'string')
                return this.encode_string(value);
            if (schema === 'bool')
                return this.encode_boolean(value);
        }
        if (typeof schema === 'object') {
            if ('option' in schema)
                return this.encode_option(value, schema);
            if ('enum' in schema)
                return this.encode_enum(value, schema);
            if ('array' in schema)
                return this.encode_array(value, schema);
            if ('set' in schema)
                return this.encode_set(value, schema);
            if ('map' in schema)
                return this.encode_map(value, schema);
            if ('struct' in schema)
                return this.encode_struct(value, schema);
        }
    }
    encode_integer(value, schema) {
        const size = parseInt(schema.substring(1));
        if (size <= 32 || schema == 'f64') {
            utils.expect_type(value, 'number');
            this.encoded.store_value(value, schema);
        }
        else {
            utils.expect_BN(value);
            value = typeof value === 'number' ? new bn_js_1.default(value) : value;
            this.encode_bigint(value, size);
        }
    }
    encode_bigint(value, size) {
        const buffer_len = size / 8;
        const buffer = value.toArray('le', buffer_len);
        if (value.lt(new bn_js_1.default(0))) {
            // compute two's complement
            let carry = 1;
            for (let i = 0; i < buffer_len; i++) {
                const v = (buffer[i] ^ 0xff) + carry;
                carry = v >> 8;
                buffer[i] = v & 0xff;
            }
        }
        this.encoded.store_bytes(new Uint8Array(buffer));
    }
    encode_string(value) {
        utils.expect_type(value, 'string');
        const _value = value;
        // 4 bytes for length
        this.encoded.store_value(_value.length, 'u32');
        // string bytes
        for (let i = 0; i < _value.length; i++) {
            this.encoded.store_value(_value.charCodeAt(i), 'u8');
        }
    }
    encode_boolean(value) {
        utils.expect_type(value, 'boolean');
        this.encoded.store_value(value ? 1 : 0, 'u8');
    }
    encode_option(value, schema) {
        if (value === null || value === undefined) {
            this.encoded.store_value(0, 'u8');
        }
        else {
            this.encoded.store_value(1, 'u8');
            this.encode_value(value, schema.option);
        }
    }
    encode_enum(value, schema) {
        utils.expect_enum(value);
        const valueKey = Object.keys(value)[0];
        for (let i = 0; i < schema.enum.length; i++) {
            const valueSchema = schema.enum[i];
            if (valueKey === Object.keys(valueSchema.struct)[0]) {
                this.encoded.store_value(i, 'u8');
                return this.encode_struct(value, valueSchema);
            }
        }
        throw new Error(`Enum key (${valueKey}) not found in enum schema: ${JSON.stringify(schema)}`);
    }
    encode_array(value, schema) {
        if (utils.isArrayLike(value))
            return this.encode_arraylike(value, schema);
        if (value instanceof ArrayBuffer)
            return this.encode_buffer(value, schema);
        throw new Error(`Expected Array-like not ${typeof (value)}(${value})`);
    }
    encode_arraylike(value, schema) {
        if (schema.array.len) {
            utils.expect_same_size(value.length, schema.array.len);
        }
        else {
            // 4 bytes for length
            this.encoded.store_value(value.length, 'u32');
        }
        // array values
        for (let i = 0; i < value.length; i++) {
            this.encode_value(value[i], schema.array.type);
        }
    }
    encode_buffer(value, schema) {
        if (schema.array.len) {
            utils.expect_same_size(value.byteLength, schema.array.len);
        }
        else {
            // 4 bytes for length
            this.encoded.store_value(value.byteLength, 'u32');
        }
        // array values
        this.encoded.store_bytes(new Uint8Array(value));
    }
    encode_set(value, schema) {
        utils.expect_type(value, 'object');
        const isSet = value instanceof Set;
        const values = isSet ? Array.from(value.values()) : Object.values(value);
        // 4 bytes for length
        this.encoded.store_value(values.length, 'u32');
        // set values
        for (const value of values) {
            this.encode_value(value, schema.set);
        }
    }
    encode_map(value, schema) {
        utils.expect_type(value, 'object');
        const isMap = value instanceof Map;
        const keys = isMap ? Array.from(value.keys()) : Object.keys(value);
        // 4 bytes for length
        this.encoded.store_value(keys.length, 'u32');
        // store key/values
        for (const key of keys) {
            this.encode_value(key, schema.map.key);
            this.encode_value(isMap ? value.get(key) : value[key], schema.map.value);
        }
    }
    encode_struct(value, schema) {
        utils.expect_type(value, 'object');
        for (const key of Object.keys(schema.struct)) {
            this.encode_value(value[key], schema.struct[key]);
        }
    }
}
exports.BorshSerializer = BorshSerializer;
