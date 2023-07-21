import { ArrayType, DecodeTypes, MapType, IntegerType, OptionType, Schema, SetType, StructType } from './types';
import { DecodeBuffer } from './buffer';
import BN from 'bn.js';
export declare class BorshDeserializer {
    buffer: DecodeBuffer;
    constructor(bufferArray: Uint8Array);
    decode(schema: Schema, classType?: ObjectConstructor): DecodeTypes;
    decode_value(schema: Schema, classType?: ObjectConstructor): DecodeTypes;
    decode_integer(schema: IntegerType): number | BN;
    decode_bigint(size: number): BN;
    decode_string(): string;
    decode_boolean(): boolean;
    decode_option(schema: OptionType): DecodeTypes;
    decode_array(schema: ArrayType): Array<any>;
    decode_set(schema: SetType): Set<any>;
    decode_map(schema: MapType): Map<any, any>;
    decode_struct(schema: StructType, classType?: ObjectConstructor): object;
}
