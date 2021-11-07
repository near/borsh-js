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
export declare const getSuperClasses: (targetClass: any) => any[];
export declare function Field(fieldInfoPartial: {
    type: any;
    option?: boolean;
    index?: number;
}): (target: {} | any, name?: PropertyKey) => any;
/**
 * @param object
 */
export declare const generateSchema: (clazzes: any[], validate?: boolean) => Map<any, StructKind>;
