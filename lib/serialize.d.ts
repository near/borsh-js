import { ArrayType, MapType, IntegerType, OptionType, Schema, SetType, StructType } from './types';
import { EncodeBuffer } from './buffer';
import BN from 'bn.js';
export declare class BorshSerializer {
    encoded: EncodeBuffer;
    encode(value: unknown, schema: Schema): Uint8Array;
    encode_value(value: unknown, schema: Schema): void;
    encode_integer(value: unknown, schema: IntegerType): void;
    encode_bigint(value: BN, size: number): void;
    encode_string(value: unknown): void;
    encode_boolean(value: unknown): void;
    encode_option(value: unknown, schema: OptionType): void;
    encode_array(value: unknown, schema: ArrayType): void;
    encode_arraylike(value: ArrayLike<unknown>, schema: ArrayType): void;
    encode_buffer(value: ArrayBuffer, schema: ArrayType): void;
    encode_set(value: unknown, schema: SetType): void;
    encode_map(value: unknown, schema: MapType): void;
    encode_struct(value: unknown, schema: StructType): void;
}
