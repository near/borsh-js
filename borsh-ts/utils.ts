import BN from 'bn.js';
import { Schema, integers } from './types';

export function isArrayLike(value: unknown): boolean {
    // source: https://stackoverflow.com/questions/24048547/checking-if-an-object-is-array-like
    return (
        Array.isArray(value) ||
        (!!value &&
            typeof value === 'object' &&
            'length' in value &&
            typeof (value.length) === 'number' &&
            (value.length === 0 ||
                (value.length > 0 &&
                    (value.length - 1) in value)
            )
        )
    );
}

export function expect_type(value: unknown, type: string): void {
    if (typeof (value) !== type) {
        throw new Error(`Expected ${type} not ${typeof (value)}(${value})`);
    }
}

export function expect_BN(value: unknown): void {
    if (!(value instanceof BN)) {
        throw new Error(`Expected BN not ${typeof (value)}(${value})`);
    }
}

export function expect_same_size(length: number, expected: number): void {
    if (length !== expected) {
        throw new Error(`Array length ${length} does not match schema length ${expected}`);
    }
}

// Validate Schema
const VALID_STRING_TYPES = integers.concat(['bool', 'string']);
const VALID_OBJECT_KEYS = ['option', 'array', 'set', 'map', 'struct'];

export class ErrorSchema extends Error {
    constructor(schema: Schema, expected: string) {
        const message = `Invalid schema: ${JSON.stringify(schema)} expected ${expected}`;
        super(message);
    }
}

export function validate_schema(schema: Schema): void {
    if (typeof (schema) === 'string' && VALID_STRING_TYPES.includes(schema)) {
        return;
    }

    if (schema && typeof (schema) === 'object') {
        const keys = Object.keys(schema);

        if (keys.length === 1 && VALID_OBJECT_KEYS.includes(keys[0])) {
            const key = keys[0];

            if (key === 'option') return validate_schema(schema[key]);
            if (key === 'array') return validate_array_schema(schema[key]);
            if (key === 'set') return validate_schema(schema[key]);
            if (key === 'map') return validate_map_schema(schema[key]);
            if (key === 'struct') return validate_struct_schema(schema[key]);
        }
    }
    throw new ErrorSchema(schema, VALID_OBJECT_KEYS.join(', ') + ' or ' + VALID_STRING_TYPES.join(', '));
}

function validate_array_schema(schema: { type: Schema, len?: number }): void {
    if (typeof schema !== 'object') throw new ErrorSchema(schema, '{ type, len? }');

    if (schema.len && typeof schema.len !== 'number') {
        throw new Error(`Invalid schema: ${schema}`);
    }

    if ('type' in schema) return validate_schema(schema.type);

    throw new ErrorSchema(schema, '{ type, len? }');
}

function validate_map_schema(schema: { key: Schema, value: Schema }): void {
    if (typeof schema === 'object' && 'key' in schema && 'value' in schema) {
        validate_schema(schema.key);
        validate_schema(schema.value);
    } else {
        throw new ErrorSchema(schema, '{ key, value }');
    }
}

function validate_struct_schema(schema: { [key: string]: Schema }): void {
    if (typeof schema !== 'object') throw new ErrorSchema(schema, 'object');

    for (const key in schema) {
        validate_schema(schema[key]);
    }
}