/// <reference types="node" />
import type BN from 'bn.js';
export declare function baseEncode(value: Uint8Array | string): string;
export declare function baseDecode(value: string): Buffer;
export declare type Schema = Map<Function, any>;
export declare class BorshError extends Error {
    originalMessage: string;
    fieldPath: string[];
    constructor(message: string);
    addToFieldPath(fieldName: string): void;
}
export declare class BinaryWriter {
    buf: Buffer;
    length: number;
    constructor();
    maybeResize(): void;
    writeU8(value: number): void;
    writeU16(value: number): void;
    writeU32(value: number): void;
    private writeBigInteger;
    writeU64(value: number | bigint | BN): void;
    writeU128(value: number | bigint | BN): void;
    writeU256(value: number | bigint | BN): void;
    writeU512(value: number | bigint | BN): void;
    private writeBuffer;
    writeString(str: string): void;
    writeFixedArray(array: Uint8Array): void;
    writeArray(array: any[], fn: any): void;
    toArray(): Uint8Array;
}
export declare class BinaryReader {
    buf: Buffer;
    offset: number;
    constructor(buf: Buffer);
    readU8(): number;
    readU16(): number;
    readU32(): number;
    private readBigInteger;
    readU64(): bigint;
    readU128(): bigint;
    readU256(): bigint;
    readU512(): bigint;
    private readBuffer;
    readString(): string;
    readFixedArray(len: number): Uint8Array;
    readArray(fn: any): any[];
}
export declare function serialize(schema: Schema, obj: any, Writer?: typeof BinaryWriter): Uint8Array;
export declare function deserialize<T>(schema: Schema, classType: {
    new (args: any): T;
}, buffer: Buffer, Reader?: typeof BinaryReader): T;
export declare function deserializeUnchecked<T>(schema: Schema, classType: {
    new (args: any): T;
}, buffer: Buffer, Reader?: typeof BinaryReader): T;
