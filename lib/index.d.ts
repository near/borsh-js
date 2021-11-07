/// <reference types="node" />
import { Schema } from "./schema";
import { BinaryWriter, BinaryReader } from "./binary";
export declare function baseEncode(value: Uint8Array | string): string;
export declare function baseDecode(value: string): Buffer;
export declare function serializeField(schema: Schema, fieldName: string, value: any, fieldType: any, writer: any): void;
export declare function serializeStruct(schema: Schema, obj: any, writer: BinaryWriter): void;
export declare function serialize(schema: Schema, obj: any, Writer?: typeof BinaryWriter): Uint8Array;
export declare function deserialize<T>(schema: Schema, classType: {
    new (args: any): T;
}, buffer: Buffer, Reader?: typeof BinaryReader): T;
export declare function deserializeUnchecked<T>(schema: Schema, classType: {
    new (args: any): T;
}, buffer: Buffer, Reader?: typeof BinaryReader): T;
