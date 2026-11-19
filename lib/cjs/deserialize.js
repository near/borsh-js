"use strict";
exports.__esModule = true;
exports.BorshDeserializer = void 0;
var types_js_1 = require("./types.js");
var buffer_js_1 = require("./buffer.js");
var BorshDeserializer = /** @class */ (function () {
    function BorshDeserializer(bufferArray) {
        this.buffer = new buffer_js_1.DecodeBuffer(bufferArray);
    }
    BorshDeserializer.prototype.decode = function (schema) {
        var value = this.decode_value(schema);
        if (this.buffer.offset !== this.buffer.buffer_size) {
            throw new Error("Unexpected trailing bytes: ".concat(this.buffer.buffer_size - this.buffer.offset));
        }
        return value;
    };
    BorshDeserializer.prototype.decode_value = function (schema) {
        if (typeof schema === 'string') {
            if (types_js_1.integers.includes(schema))
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
        throw new Error("Unsupported type: ".concat(schema));
    };
    BorshDeserializer.prototype.decode_integer = function (schema) {
        var size = parseInt(schema.substring(1));
        if (size <= 32 || schema == 'f64') {
            return this.buffer.consume_value(schema);
        }
        return this.decode_bigint(size, schema.startsWith('i'));
    };
    BorshDeserializer.prototype.decode_bigint = function (size, signed) {
        if (signed === void 0) { signed = false; }
        var buffer_len = size / 8;
        var buffer = new Uint8Array(this.buffer.consume_bytes(buffer_len));
        var bits = buffer.reduceRight(function (r, x) { return r + x.toString(16).padStart(2, '0'); }, '');
        if (signed && buffer[buffer_len - 1]) {
            return BigInt.asIntN(size, BigInt("0x".concat(bits)));
        }
        return BigInt("0x".concat(bits));
    };
    BorshDeserializer.prototype.decode_string = function () {
        var len = this.decode_integer('u32');
        var buffer = new Uint8Array(this.buffer.consume_bytes(len));
        // Decode Unicode scalar values without requiring a TextDecoder implementation.
        var codePoints = [];
        for (var i = 0; i < len; ++i) {
            var byte = buffer[i];
            if (byte < 0x80) {
                codePoints.push(byte);
                continue;
            }
            var codePoint = void 0;
            var byteLength = void 0;
            var minimum = void 0;
            if (byte >= 0xC2 && byte <= 0xDF) {
                codePoint = byte & 0x1F;
                byteLength = 2;
                minimum = 0x80;
            }
            else if (byte >= 0xE0 && byte <= 0xEF) {
                codePoint = byte & 0x0F;
                byteLength = 3;
                minimum = 0x800;
            }
            else if (byte >= 0xF0 && byte <= 0xF4) {
                codePoint = byte & 0x07;
                byteLength = 4;
                minimum = 0x10000;
            }
            else {
                throw new Error('Invalid UTF-8 string');
            }
            if (i + byteLength > len) {
                throw new Error('Invalid UTF-8 string');
            }
            for (var j = 1; j < byteLength; ++j) {
                var continuation = buffer[i + j];
                if ((continuation & 0xC0) !== 0x80) {
                    throw new Error('Invalid UTF-8 string');
                }
                codePoint = (codePoint << 6) | (continuation & 0x3F);
            }
            if (codePoint < minimum || codePoint > 0x10FFFF || (codePoint >= 0xD800 && codePoint <= 0xDFFF)) {
                throw new Error('Invalid UTF-8 string');
            }
            codePoints.push(codePoint);
            i += byteLength - 1;
        }
        // then decode code points to utf-8
        return String.fromCodePoint.apply(String, codePoints);
    };
    BorshDeserializer.prototype.decode_boolean = function () {
        var value = this.buffer.consume_value('u8');
        if (value > 1) {
            throw new Error("Invalid boolean value: ".concat(value));
        }
        return value === 1;
    };
    BorshDeserializer.prototype.decode_option = function (schema) {
        var option = this.buffer.consume_value('u8');
        if (option === 1) {
            return this.decode_value(schema.option);
        }
        if (option !== 0) {
            throw new Error("Invalid option ".concat(option));
        }
        return null;
    };
    BorshDeserializer.prototype.decode_enum = function (schema) {
        var _a;
        var valueIndex = this.buffer.consume_value('u8');
        if (valueIndex >= schema["enum"].length) {
            throw new Error("Enum option ".concat(valueIndex, " is not available"));
        }
        var struct = schema["enum"][valueIndex].struct;
        var key = Object.keys(struct)[0];
        return _a = {}, _a[key] = this.decode_value(struct[key]), _a;
    };
    BorshDeserializer.prototype.decode_array = function (schema) {
        var result = [];
        var len = schema.array.len ? schema.array.len : this.decode_integer('u32');
        for (var i = 0; i < len; ++i) {
            result.push(this.decode_value(schema.array.type));
        }
        return result;
    };
    BorshDeserializer.prototype.decode_set = function (schema) {
        var len = this.decode_integer('u32');
        var result = new Set();
        for (var i = 0; i < len; ++i) {
            result.add(this.decode_value(schema.set));
        }
        return result;
    };
    BorshDeserializer.prototype.decode_map = function (schema) {
        var len = this.decode_integer('u32');
        var result = new Map();
        for (var i = 0; i < len; ++i) {
            var key = this.decode_value(schema.map.key);
            var value = this.decode_value(schema.map.value);
            result.set(key, value);
        }
        return result;
    };
    BorshDeserializer.prototype.decode_struct = function (schema) {
        var result = {};
        for (var key in schema.struct) {
            result[key] = this.decode_value(schema.struct[key]);
        }
        return result;
    };
    return BorshDeserializer;
}());
exports.BorshDeserializer = BorshDeserializer;
