import { ArrayType, MapType, IntegerType, OptionType, Schema, SetType, StructType, integers, EnumType } from './types';
import { EncodeBuffer } from './buffer';
import BN from 'bn.js';
import * as utils from './utils';

export class BorshSerializer {
    encoded: EncodeBuffer = new EncodeBuffer();

    encode(value: unknown, schema: Schema): Uint8Array {
        utils.validate_schema(schema);
        this.encode_value(value, schema);
        return this.encoded.get_used_buffer();
    }

    encode_value(value: unknown, schema: Schema): void {
        if (typeof schema === 'string') {
            if (integers.includes(schema)) return this.encode_integer(value, schema);
            if (schema === 'string') return this.encode_string(value);
            if (schema === 'bool') return this.encode_boolean(value);
        }

        if (typeof schema === 'object') {
            if ('option' in schema) return this.encode_option(value, schema as OptionType);
            if ('enum' in schema) return this.encode_enum(value, schema as EnumType);
            if ('array' in schema) return this.encode_array(value, schema as ArrayType);
            if ('set' in schema) return this.encode_set(value, schema as SetType);
            if ('map' in schema) return this.encode_map(value, schema as MapType);
            if ('struct' in schema) return this.encode_struct(value, schema as StructType);
        }
    }

    encode_integer(value: unknown, schema: IntegerType): void {
        const size: number = parseInt(schema.substring(1));

        if (size <= 32 || schema == 'f64') {
            utils.expect_type(value, 'number');
            this.encoded.store_value(value as number, schema);
        } else {
            utils.expect_BN(value);
            this.encode_bigint(value as BN, size);
        }
    }

    encode_bigint(value: BN, size: number): void {
        const buffer_len = size / 8;
        const buffer = value.toArray('le', buffer_len);

        if (value.lt(new BN(0))) {
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

    encode_string(value: unknown): void {
        utils.expect_type(value, 'string');
        const _value = value as string;

        // 4 bytes for length
        this.encoded.store_value(_value.length, 'u32');

        // string bytes
        for (let i = 0; i < _value.length; i++) {
            this.encoded.store_value(_value.charCodeAt(i), 'u8');
        }
    }

    encode_boolean(value: unknown): void {
        utils.expect_type(value, 'boolean');
        this.encoded.store_value(value as boolean ? 1 : 0, 'u8');
    }

    encode_option(value: unknown, schema: OptionType): void {
        if (value === null || value === undefined) {
            this.encoded.store_value(0, 'u8');
        } else {
            this.encoded.store_value(1, 'u8');
            this.encode_value(value, schema.option);
        }
    }

    encode_enum(value: unknown, schema: EnumType): void {
        utils.expect_enum(value);

        const valueKey = Object.keys(value)[0];

        for (let i = 0; i < schema.enum.length; i++) {
            const valueSchema = schema.enum[i] as StructType;

            if (valueKey === Object.keys(valueSchema.struct)[0]) {
                this.encoded.store_value(i, 'u8');
                return this.encode_struct(value, valueSchema as StructType);
            }
        }
        throw new Error(`Enum key (${valueKey}) not found in enum schema: ${JSON.stringify(schema)}`);
    }

    encode_array(value: unknown, schema: ArrayType): void {
        if (utils.isArrayLike(value)) return this.encode_arraylike(value as ArrayLike<unknown>, schema);
        if (value instanceof ArrayBuffer) return this.encode_buffer(value, schema);
        throw new Error(`Expected Array-like not ${typeof (value)}(${value})`);
    }

    encode_arraylike(value: ArrayLike<unknown>, schema: ArrayType): void {
        if (schema.array.len) {
            utils.expect_same_size(value.length, schema.array.len);
        } else {
            // 4 bytes for length
            this.encoded.store_value(value.length, 'u32');
        }

        // array values
        for (let i = 0; i < value.length; i++) {
            this.encode_value(value[i], schema.array.type);
        }
    }

    encode_buffer(value: ArrayBuffer, schema: ArrayType): void {
        if (schema.array.len) {
            utils.expect_same_size(value.byteLength, schema.array.len);
        } else {
            // 4 bytes for length
            this.encoded.store_value(value.byteLength, 'u32');
        }

        // array values
        this.encoded.store_bytes(new Uint8Array(value));
    }

    encode_set(value: unknown, schema: SetType): void {
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

    encode_map(value: unknown, schema: MapType): void {
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

    encode_struct(value: unknown, schema: StructType): void {
        utils.expect_type(value, 'object');

        for (const key of Object.keys(value)) {
            this.encode_value(value[key], schema.struct[key]);
        }
    }
}