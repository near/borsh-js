import { ArrayType, DecodeTypes, MapType, IntegerType, OptionType, Schema, SetType, StructType, integers, EnumType } from './types.js';
import { DecodeBuffer } from './buffer.js';

export class BorshDeserializer {
    buffer: DecodeBuffer;

    constructor(bufferArray: Uint8Array) {
        this.buffer = new DecodeBuffer(bufferArray);
    }

    decode(schema: Schema): DecodeTypes {
        const value = this.decode_value(schema);
        if (this.buffer.offset !== this.buffer.buffer_size) {
            throw new Error(`Unexpected trailing bytes: ${this.buffer.buffer_size - this.buffer.offset}`);
        }
        return value;
    }

    decode_value(schema: Schema): DecodeTypes {
        if (typeof schema === 'string') {
            if (integers.includes(schema)) return this.decode_integer(schema);
            if (schema === 'string') return this.decode_string();
            if (schema === 'bool') return this.decode_boolean();
        }

        if (typeof schema === 'object') {
            if ('option' in schema) return this.decode_option(schema as OptionType);
            if ('enum' in schema) return this.decode_enum(schema as EnumType);
            if ('array' in schema) return this.decode_array(schema as ArrayType);
            if ('set' in schema) return this.decode_set(schema as SetType);
            if ('map' in schema) return this.decode_map(schema as MapType);
            if ('struct' in schema) return this.decode_struct(schema as StructType);
        }

        throw new Error(`Unsupported type: ${schema}`);
    }

    decode_integer(schema: IntegerType): number | bigint {
        const size: number = parseInt(schema.substring(1));

        if (size <= 32 || schema == 'f64') {
            return this.buffer.consume_value(schema);
        }
        return this.decode_bigint(size, schema.startsWith('i'));
    }

    decode_bigint(size: number, signed = false): bigint {
        const buffer_len = size / 8;
        const buffer = new Uint8Array(this.buffer.consume_bytes(buffer_len));
        const bits = buffer.reduceRight((r, x) => r + x.toString(16).padStart(2, '0'), '');

        if (signed && buffer[buffer_len - 1]) {
            return BigInt.asIntN(size, BigInt(`0x${bits}`));
        }
        return BigInt(`0x${bits}`);
    }

    decode_string(): string {
        const len: number = this.decode_integer('u32') as number;
        const buffer = new Uint8Array(this.buffer.consume_bytes(len));

        // Decode Unicode scalar values without requiring a TextDecoder implementation.
        const codePoints = [];
        for (let i = 0; i < len; ++i) {
            const byte = buffer[i];
            if (byte < 0x80) {
                codePoints.push(byte);
                continue;
            }

            let codePoint: number;
            let byteLength: number;
            let minimum: number;
            if (byte >= 0xC2 && byte <= 0xDF) {
                codePoint = byte & 0x1F;
                byteLength = 2;
                minimum = 0x80;
            } else if (byte >= 0xE0 && byte <= 0xEF) {
                codePoint = byte & 0x0F;
                byteLength = 3;
                minimum = 0x800;
            } else if (byte >= 0xF0 && byte <= 0xF4) {
                codePoint = byte & 0x07;
                byteLength = 4;
                minimum = 0x10000;
            } else {
                throw new Error('Invalid UTF-8 string');
            }

            if (i + byteLength > len) {
                throw new Error('Invalid UTF-8 string');
            }
            for (let j = 1; j < byteLength; ++j) {
                const continuation = buffer[i + j];
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
        return String.fromCodePoint(...codePoints);
    }

    decode_boolean(): boolean {
        const value = this.buffer.consume_value('u8');
        if (value > 1) {
            throw new Error(`Invalid boolean value: ${value}`);
        }
        return value === 1;
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

    decode_enum(schema: EnumType): DecodeTypes {
        const valueIndex = this.buffer.consume_value('u8');

        if (valueIndex >= schema.enum.length) {
            throw new Error(`Enum option ${valueIndex} is not available`);
        }

        const struct = schema.enum[valueIndex].struct;
        const key = Object.keys(struct)[0];
        return { [key]: this.decode_value(struct[key]) };
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

    decode_struct(schema: StructType): object {
        const result = {};
        for (const key in schema.struct) {
            result[key] = this.decode_value(schema.struct[key]);
        }
        return result;
    }
}