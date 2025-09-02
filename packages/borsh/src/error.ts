export class BorshError extends Error {
    originalMessage: string;
    fieldPath: string[] = [];

    constructor(message: string) {
        super(message);
        this.originalMessage = message;
    }

    addToFieldPath(fieldName: string) {
        this.fieldPath.splice(0, 0, fieldName);
        this.message = this.originalMessage + ". Error originated at field path: " + this.fieldPath.join(".");
    }
}
