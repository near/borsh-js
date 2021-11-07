export declare class BorshError extends Error {
    originalMessage: string;
    fieldPath: string[];
    constructor(message: string);
    addToFieldPath(fieldName: string): void;
}
