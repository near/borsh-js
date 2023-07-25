import BN from 'bn.js';

export const integers = ['u8', 'u16', 'u32', 'u64', 'u128', 'i8', 'i16', 'i32', 'i64', 'i128', 'f32', 'f64'];

export type IntegerType = typeof integers[number];
export type BoolType = 'bool';
export type StringType = 'string';

export type OptionType = { option: Schema };
export type ArrayType = { array: { type: Schema, len?: number } };
export type EnumType = { enum: Array<StructType> };
export type SetType = { set: Schema };
export type MapType = { map: { key: Schema, value: Schema } };
export type StructType = { struct: { [key: string]: Schema } };
export type Schema = IntegerType | StringType | ArrayType | SetType | MapType | StructType;

// returned
export type DecodeTypes = number | BN | string | boolean | Array<DecodeTypes> | EnumType | ArrayBuffer | Map<DecodeTypes, DecodeTypes> | Set<DecodeTypes> | object | null;
