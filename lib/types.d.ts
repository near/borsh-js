import BN from 'bn.js';
export declare const integers: string[];
export type IntegerType = typeof integers[number];
export type BoolType = 'bool';
export type StringType = 'string';
export type OptionType = {
    option: Schema;
};
export type ArrayType = {
    array: {
        type: Schema;
        len?: number;
    };
};
export type SetType = {
    set: Schema;
};
export type MapType = {
    map: {
        key: Schema;
        value: Schema;
    };
};
export type StructType = {
    struct: {
        [key: string]: Schema;
    };
};
export type Schema = IntegerType | StringType | ArrayType | SetType | MapType | StructType;
export type DecodeTypes = number | BN | string | boolean | Array<any> | ArrayBuffer | Map<any, any> | Set<any> | object | null;
