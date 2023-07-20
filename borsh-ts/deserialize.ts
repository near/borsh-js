import { ArrayType, DecodeTypes, MapType, NumberType, OptionType, Schema, SetType, StructType, numbers } from './types';
import { DecodeBuffer } from './buffer';
import BN from 'bn.js';

export class BorshDeserializer {
    buffer: DecodeBuffer;

    constructor(bufferArray: Uint8Array) {
        this.buffer = new DecodeBuffer(bufferArray);
    }

    decode(schema: Schema, classType?: ObjectConstructor): DecodeTypes {

        if (typeof schema === 'string') {
            if (numbers.includes(schema)) return this.decode_integer(schema);
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

    decode_integer(schema: NumberType): number | BN {
        const size: number = parseInt(schema.substring(1));

        if (size <= 32 || schema == 'f64') {
            return this.buffer.consume_value(schema);
        }
        return this.decode_bigint(size);
    }

    decode_bigint(size: number): BN {
        const buffer_len = size / 8;
        const buffer = new Uint8Array(this.buffer.consume_bytes(buffer_len));
        const value = new BN(buffer, 'le');

        if (value.testn(buffer_len * 8 - 1)) {
            // negative number
            const buffer = value.toArray('le', buffer_len + 1);
            let carry = 1;
            for (let i = 0; i < buffer_len; i++) {
                const v = (buffer[i] ^ 0xff) + carry;
                buffer[i] = v & 0xff;
                carry = v >> 8;
            }
            return new BN(buffer, 'le').mul(new BN(-1));
        }

        return value;
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
            return this.decode(schema.option);
        }
        if (option !== 0) {
            throw new Error(`Invalid option ${option}`);
        }
        return null;
    }

    decode_array(schema: ArrayType): Array<any> {
        const result = [];
        const len = schema.array.len? schema.array.len : this.decode_integer('u32') as number;

        for (let i = 0; i < len; ++i) {
            result.push(this.decode(schema.array.type));
        }

        return result;
    }

    decode_set(schema: SetType): Set<any> {
        const len = this.decode_integer('u32') as number;
        const result = new Set();
        for (let i = 0; i < len; ++i) {
            result.add(this.decode(schema.set));
        }
        return result;
    }

    decode_map(schema: MapType): Map<any, any> {
        const len = this.decode_integer('u32') as number;
        const result = new Map();
        for (let i = 0; i < len; ++i) {
            const key = this.decode(schema.map.key);
            const value = this.decode(schema.map.value);
            result.set(key, value);
        }
        return result;
    }

    decode_struct(schema: StructType, classType?: ObjectConstructor): object {
        const result = {};
        for (const key in schema.struct) {
            result[key] = this.decode(schema.struct[key]);
        }
        return classType? new classType(result) : result;
    }
}