import { Schema, StructType, integers } from './types.js';

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

export function expect_type(value: unknown, type: string, fieldPath: string[]): void {
    if (typeof (value) !== type) {
        throw new Error(`Expected ${type} not ${typeof (value)}(${value}) at ${fieldPath.join('.')}`);
    }
}

export function expect_BN(value: unknown, fieldPath: string[]): void {
    if (!['number', 'string', 'bigint'].includes(typeof(value))) {
        throw new Error(`Expected BN, number or string not ${typeof (value)}(${value}) at ${fieldPath.join('.')}`);
    }
}

export function expect_same_size(length: number, expected: number, fieldPath: string[]): void {
    if (length !== expected) {
        throw new Error(`Array length ${length} does not match schema length ${expected} at ${fieldPath.join('.')}`);
    }
}

export function expect_enum(value: unknown, fieldPath: string[]): void {
    if(typeof (value) !== 'object' || value === null ) {
        throw new Error(`Expected object not ${typeof (value)}(${value}) at ${fieldPath.join('.')}`);
    }
}

// Validate Schema
const VALID_STRING_TYPES = integers.concat(['bool', 'string']);
const VALID_OBJECT_KEYS = ['option', 'enum', 'array', 'set', 'map', 'struct'];

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
            if (key === 'enum') return validate_enum_schema(schema[key]);
            if (key === 'array') return validate_array_schema(schema[key]);
            if (key === 'set') return validate_schema(schema[key]);
            if (key === 'map') return validate_map_schema(schema[key]);
            if (key === 'struct') return validate_struct_schema(schema[key]);
        }
    }
    throw new ErrorSchema(schema, VALID_OBJECT_KEYS.join(', ') + ' or ' + VALID_STRING_TYPES.join(', '));
}

function validate_enum_schema(schema:  Array<StructType>): void {
    if (!Array.isArray(schema)) throw new ErrorSchema(schema, 'Array');

    for (const sch of schema) {
        if (typeof sch !== 'object' || !('struct' in sch)) {
            throw new Error('Missing "struct" key in enum schema');
        }

        if (typeof sch.struct !== 'object' || Object.keys(sch.struct).length !== 1) {
            throw new Error('The "struct" in each enum must have a single key');
        }

        validate_schema({struct: sch.struct});
    }
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