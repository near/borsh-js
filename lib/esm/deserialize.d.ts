import { ArrayType, DecodeTypes, MapType, IntegerType, OptionType, Schema, SetType, StructType, EnumType } from './types.js';
import { DecodeBuffer } from './buffer.js';
import BN from 'bn.js';
export declare class BorshDeserializer {
    buffer: DecodeBuffer;
    constructor(bufferArray: Uint8Array);
    decode(schema: Schema): DecodeTypes;
    decode_value(schema: Schema): DecodeTypes;
    decode_integer(schema: IntegerType): number | BN;
    decode_bigint(size: number, signed?: boolean): BN;
    decode_string(): string;
    decode_boolean(): boolean;
    decode_option(schema: OptionType): DecodeTypes;
    decode_enum(schema: EnumType): DecodeTypes;
    decode_array(schema: ArrayType): Array<DecodeTypes>;
    decode_set(schema: SetType): Set<DecodeTypes>;
    decode_map(schema: MapType): Map<DecodeTypes, DecodeTypes>;
    decode_struct(schema: StructType): object;
}
