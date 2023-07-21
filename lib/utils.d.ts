import { Schema } from './types';
export declare function isArrayLike(value: unknown): boolean;
export declare function expect_type(value: unknown, type: string): void;
export declare function expect_BN(value: unknown): void;
export declare function expect_same_size(length: number, expected: number): void;
export declare class ErrorSchema extends Error {
    constructor(schema: Schema, expected: string);
}
export declare function validate_schema(schema: Schema): void;
