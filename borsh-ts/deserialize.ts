import { ArrayType, DecodeTypes, MapType, IntegerType, OptionType, Schema, SetType, StructType, integers } from './types';
import * as utils from './utils';
import { DecodeBuffer } from './buffer';
import BN from 'bn.js';

export class BorshDeserializer {
    buffer: DecodeBuffer;

    constructor(bufferArray: Uint8Array) {
        this.buffer = new DecodeBuffer(bufferArray);
    }

    decode(schema: Schema, classType?: ObjectConstructor): DecodeTypes {
        utils.validate_schema(schema);
        return this.decode_value(schema, classType);
    }

    decode_value(schema: Schema, classType?: ObjectConstructor): DecodeTypes {
        if (typeof schema === 'string') {
            if (integers.includes(schema)) return this.decode_integer(schema);
            if (schema === 'string') return this.decode_string();
            if (schema === 'bool') return this.decode_boolean();
        }

        if (typeof schema === 'object') {
            if ('option' in schema) return this.decode_option(schema as OptionType);
            if ('array' in schema) return this.decode_array(schema as ArrayType);
            if ('set' in schema) return this.decode_set(schema as SetType);
            if ('map' in schema) return this.decode_map(schema as MapType);
            if ('struct' in schema) return this.decode_struct(schema as StructType, classType);
        }

        throw new Error(`Unsupported type: ${schema}`);
    }

    decode_integer(schema: IntegerType): number | BN {
        const size: number = parseInt(schema.substring(1));

        if (size <= 32 || schema == 'f64') {
            return this.buffer.consume_value(schema);
        }
        return this.decode_bigint(size);
    }

    decode_bigint(size: number): BN {
        const buffer_len = size / 8;
        const buffer = new Uint8Array(this.buffer.consume_bytes(buffer_len));

        if (buffer[buffer_len - 1]) {
            // negative number
            let carry = 1;
            for (let i = 0; i < buffer_len; i++) {
                const v = (buffer[i] ^ 0xff) + carry;
                buffer[i] = v & 0xff;
                carry = v >> 8;
            }
            return new BN(buffer, 'le').mul(new BN(-1));
        }

        return new BN(buffer, 'le');
    }

    decode_string(): string {
        const len: number = this.decode_integer('u32') as number;
        const buffer = new Uint8Array(this.buffer.consume_bytes(len));
        return String.fromCharCode.apply(null, buffer);
    }

    decode_boolean(): boolean {
        return this.buffer.consume_value('u8') > 0;
    }

    decode_option(schema: OptionType): DecodeTypes {
        const option = this.buffer.consume_value('u8');
        if (option === 1) {
            return this.decode_value(schema.option);
        }
        if (option !== 0) {
            throw new Error(`Invalid option ${option}`);
        }
        return null;
    }

    decode_array(schema: ArrayType): Array<DecodeTypes> {
        const result = [];
        const len = schema.array.len ? schema.array.len : this.decode_integer('u32') as number;

        for (let i = 0; i < len; ++i) {
            result.push(this.decode_value(schema.array.type));
        }

        return result;
    }

    decode_set(schema: SetType): Set<DecodeTypes> {
        const len = this.decode_integer('u32') as number;
        const result = new Set<DecodeTypes>();
        for (let i = 0; i < len; ++i) {
            result.add(this.decode_value(schema.set));
        }
        return result;
    }

    decode_map(schema: MapType): Map<DecodeTypes, DecodeTypes> {
        const len = this.decode_integer('u32') as number;
        const result = new Map();
        for (let i = 0; i < len; ++i) {
            const key = this.decode_value(schema.map.key);
            const value = this.decode_value(schema.map.value);
            result.set(key, value);
        }
        return result;
    }

    decode_struct(schema: StructType, classType?: ObjectConstructor): object {
        const result = {};
        for (const key in schema.struct) {
            result[key] = this.decode_value(schema.struct[key]);
        }
        return classType ? new classType(result) : result;
    }
}