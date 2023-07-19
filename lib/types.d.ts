export declare const numbers: string[];
export type NumberType = typeof numbers[number];
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
export type Schema = NumberType | StringType | ArrayType | SetType | MapType | StructType;
