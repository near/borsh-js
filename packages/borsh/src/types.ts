import { BinaryReader, BinaryWriter } from "./binary.js";
import { BorshError } from "./error.js";

/**
 * Class with constructor
 */
export type Constructor<T> = new (...args: any[]) => T;
export type AbstractType<T> = Function & { prototype: T }


export const extendingClasses = (clazz: any): any[] => {
    let ret = [];
    if (clazz instanceof Function) {
        let baseClass = clazz;
        while (baseClass) {
            const newBaseClass = Object.getPrototypeOf(baseClass);
            if (newBaseClass && newBaseClass !== Object && newBaseClass.name) {
                ret.push(newBaseClass)
                baseClass = newBaseClass;
            } else {
                return ret;
            }
        }
    }
    return ret;
};

/**
 * @param clazz 
 * @returns extendingClasses(clazz).length
 */
export const getOffset = (clazz: any) => extendingClasses(clazz).length;

export interface OverrideType<T> {
    serialize: (arg: T, writer: BinaryWriter) => void;
    deserialize: (reader: BinaryReader) => T;
}
export type SmallIntegerType = "u8"
    | "u16"
    | "u32"

export type IntegerType =
    SmallIntegerType
    | "u64"
    | "u128"
    | "u256"
    | "u512"

export type FloatType = 'f32' | 'f64';

export type PrimitiveType = "bool"
    | "string"
    | IntegerType
    | FloatType

export type FieldType =
    PrimitiveType
    | Constructor<any>
    | AbstractType<any>
    | CustomField<any>
    | WrappedType
    | Uint8Array
    | StringType

export type SimpleField = { type: FieldType; index?: number };
export interface CustomField<T> extends OverrideType<T> {
    index?: number;
}

export class WrappedType {
    elementType: FieldType;
    constructor(elementType: FieldType) {
        this.elementType = elementType;
    }

    getDependency(): Constructor<any> | AbstractType<any> | undefined {
        if (typeof this.elementType === "function") return this.elementType;
        if (this.elementType instanceof WrappedType)
            return this.elementType.getDependency(); // Recursive
        return undefined;
    }
}

export class StringType {
    sizeEncoding: SmallIntegerType
    constructor(sizeEncoding: SmallIntegerType) {
        this.sizeEncoding = sizeEncoding;
    }
}

export const string = (sizeEncoding: SmallIntegerType): StringType => {
    return new StringType(sizeEncoding);
};


export class OptionKind extends WrappedType { }

export const option = (type: FieldType): OptionKind => {
    return new OptionKind(type);
};

export class VecKind extends WrappedType {
    sizeEncoding: SmallIntegerType
    constructor(elementType: FieldType, sizeEncoding: SmallIntegerType) {
        super(elementType)
        this.sizeEncoding = sizeEncoding;
    }
}

export const vec = (type: FieldType, sizeEncoding: SmallIntegerType = 'u32'): VecKind => {
    return new VecKind(type, sizeEncoding);
};

export class FixedArrayKind extends WrappedType {
    length: number;
    constructor(type: FieldType, length: number) {
        super(type);
        this.length = length;
    }
}
export const fixedArray = (type: FieldType, length: number): FixedArrayKind => {
    return new FixedArrayKind(type, length);
};

export interface Field {
    key: string;
    type: FieldType;
}

export class StructKind {
    variant?: number | number[] | string
    serializer?: (any: any, writer: BinaryWriter, serialize: (obj: any) => Uint8Array) => void
    fields: Field[];
    constructor(properties?: { variant?: number | number[] | string, fields: Field[] }) {
        if (properties) {
            this.fields = properties.fields;
            this.variant = properties.variant;
        } else {
            this.fields = [];
        }
    }
    getDependencies(): (Constructor<any> | AbstractType<any>)[] {
        let ret: (Constructor<any> | AbstractType<any>)[] = [];
        this.fields.forEach((field, ix) => {
            if (!field) {
                throw new BorshError("Field: " + ix + " is missing specification");
            }
            if (field.type instanceof WrappedType) {
                let dependency = field.type.getDependency();
                if (dependency) ret.push(dependency);
            } else if (typeof field.type === "function") {
                ret.push(field.type);
            }
        });
        return ret;
    }
}

export interface FieldMetaData {
    alias: string;
    type: string;
}
