"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate_schema = exports.ErrorSchema = exports.expect_enum = exports.expect_same_size = exports.expect_BN = exports.expect_type = exports.isArrayLike = void 0;
const bn_js_1 = __importDefault(require("bn.js"));
const types_1 = require("./types");
function isArrayLike(value) {
    // source: https://stackoverflow.com/questions/24048547/checking-if-an-object-is-array-like
    return (Array.isArray(value) ||
        (!!value &&
            typeof value === 'object' &&
            'length' in value &&
            typeof (value.length) === 'number' &&
            (value.length === 0 ||
                (value.length > 0 &&
                    (value.length - 1) in value))));
}
exports.isArrayLike = isArrayLike;
function expect_type(value, type) {
    if (typeof (value) !== type) {
        throw new Error(`Expected ${type} not ${typeof (value)}(${value})`);
    }
}
exports.expect_type = expect_type;
function expect_BN(value) {
    if (!(value instanceof bn_js_1.default) && typeof (value) !== 'number' && typeof (value) !== 'string') {
        throw new Error(`Expected BN, number or string not ${typeof (value)}(${value})`);
    }
}
exports.expect_BN = expect_BN;
function expect_same_size(length, expected) {
    if (length !== expected) {
        throw new Error(`Array length ${length} does not match schema length ${expected}`);
    }
}
exports.expect_same_size = expect_same_size;
function expect_enum(value) {
    if (typeof (value) !== 'object' || value === null) {
        throw new Error(`Expected object not ${typeof (value)}(${value})`);
    }
}
exports.expect_enum = expect_enum;
// Validate Schema
const VALID_STRING_TYPES = types_1.integers.concat(['bool', 'string']);
const VALID_OBJECT_KEYS = ['option', 'enum', 'array', 'set', 'map', 'struct'];
class ErrorSchema extends Error {
    constructor(schema, expected) {
        const message = `Invalid schema: ${JSON.stringify(schema)} expected ${expected}`;
        super(message);
    }
}
exports.ErrorSchema = ErrorSchema;
function validate_schema(schema) {
    if (typeof (schema) === 'string' && VALID_STRING_TYPES.includes(schema)) {
        return;
    }
    if (schema && typeof (schema) === 'object') {
        const keys = Object.keys(schema);
        if (keys.length === 1 && VALID_OBJECT_KEYS.includes(keys[0])) {
            const key = keys[0];
            if (key === 'option')
                return validate_schema(schema[key]);
            if (key === 'enum')
                return validate_enum_schema(schema[key]);
            if (key === 'array')
                return validate_array_schema(schema[key]);
            if (key === 'set')
                return validate_schema(schema[key]);
            if (key === 'map')
                return validate_map_schema(schema[key]);
            if (key === 'struct')
                return validate_struct_schema(schema[key]);
        }
    }
    throw new ErrorSchema(schema, VALID_OBJECT_KEYS.join(', ') + ' or ' + VALID_STRING_TYPES.join(', '));
}
exports.validate_schema = validate_schema;
function validate_enum_schema(schema) {
    if (!Array.isArray(schema))
        throw new ErrorSchema(schema, 'Array');
    for (const sch of schema) {
        if (typeof sch !== 'object' || !('struct' in sch)) {
            throw new Error('Missing "struct" key in enum schema');
        }
        if (typeof sch.struct !== 'object' || Object.keys(sch.struct).length !== 1) {
            throw new Error('The "struct" in each enum must have a single key');
        }
        validate_schema({ struct: sch.struct });
    }
}
function validate_array_schema(schema) {
    if (typeof schema !== 'object')
        throw new ErrorSchema(schema, '{ type, len? }');
    if (schema.len && typeof schema.len !== 'number') {
        throw new Error(`Invalid schema: ${schema}`);
    }
    if ('type' in schema)
        return validate_schema(schema.type);
    throw new ErrorSchema(schema, '{ type, len? }');
}
function validate_map_schema(schema) {
    if (typeof schema === 'object' && 'key' in schema && 'value' in schema) {
        validate_schema(schema.key);
        validate_schema(schema.value);
    }
    else {
        throw new ErrorSchema(schema, '{ key, value }');
    }
}
function validate_struct_schema(schema) {
    if (typeof schema !== 'object')
        throw new ErrorSchema(schema, 'object');
    for (const key in schema) {
        validate_schema(schema[key]);
    }
}
