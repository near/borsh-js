import "reflect-metadata";
export declare type Schema = Map<Function, any>;
export interface StructKind {
    kind: 'struct';
    fields: any[][];
}
export interface OptionKind {
    kind: 'option';
    type: any;
}
export interface FieldMetaData {
    alias: string;
    type: string;
}
/**
 *
 * @param kind 'struct' or 'variant. 'variant' equivalnt to Rust Enum
 * @returns Schema decorator function for classes
 */
export declare const Variant: (index: number) => (ctor: Function) => void;
/**
 * @param properties, the properties of the field mapping to schema
 * @returns
 */
export declare function Field(properties: {
    type: any;
    option?: boolean;
    index?: number;
}): (target: {} | any, name?: PropertyKey) => any;
/**
 * @param clazzes
 * @param validate, run validation?
 * @returns Schema map
 */
export declare const generateSchemas: (clazzes: any[], validate?: boolean) => Map<any, StructKind>;
