import BN from 'bn.js';
import bs58 from 'bs58';

// TODO: Make sure this polyfill not included when not required
import * as encoding from 'text-encoding-utf-8';
const ResolvedTextDecoder =
    typeof TextDecoder !== 'function' ? encoding.TextDecoder : TextDecoder;
const textDecoder = new ResolvedTextDecoder('utf-8', { fatal: true });

export function baseEncode(value: Uint8Array | string): string {
    if (typeof value === 'string') {
        value = Buffer.from(value, 'utf8');
    }
    return bs58.encode(Buffer.from(value));
}

export function baseDecode(value: string): Buffer {
    return Buffer.from(bs58.decode(value));
}

const INITIAL_LENGTH = 1024;

export type ValueSchema = any; // TODO
export type ObjectSchema = { [key: string]: ObjectSchema | ValueSchema };

export class BorshError extends Error {
    originalMessage: string;
    fieldPath: string[] = [];

    constructor(message: string) {
        super(message);
        this.originalMessage = message;
    }

    addToFieldPath(fieldName: string): void {
        this.fieldPath.splice(0, 0, fieldName);
        // NOTE: Modifying message directly as jest doesn't use .toString()
        this.message = this.originalMessage + ': ' + this.fieldPath.join('.');
    }
}

/// Binary encoder.
export class BinaryWriter {
    buf: Buffer;
    length: number;

    public constructor() {
        this.buf = Buffer.alloc(INITIAL_LENGTH);
        this.length = 0;
    }

    maybeResize(): void {
        if (this.buf.length < 16 + this.length) {
            this.buf = Buffer.concat([this.buf, Buffer.alloc(INITIAL_LENGTH)]);
        }
    }

    public writeU8(value: number): void {
        this.maybeResize();
        this.buf.writeUInt8(value, this.length);
        this.length += 1;
    }

    public writeU16(value: number): void {
        this.maybeResize();
        this.buf.writeUInt16LE(value, this.length);
        this.length += 2;
    }

    public writeU32(value: number): void {
        this.maybeResize();
        this.buf.writeUInt32LE(value, this.length);
        this.length += 4;
    }

    public writeU64(value: number | BN): void {
        this.maybeResize();
        this.writeBuffer(Buffer.from(new BN(value).toArray('le', 8)));
    }

    public writeU128(value: number | BN): void {
        this.maybeResize();
        this.writeBuffer(Buffer.from(new BN(value).toArray('le', 16)));
    }

    public writeU256(value: number | BN): void {
        this.maybeResize();
        this.writeBuffer(Buffer.from(new BN(value).toArray('le', 32)));
    }

    public writeU512(value: number | BN): void {
        this.maybeResize();
        this.writeBuffer(Buffer.from(new BN(value).toArray('le', 64)));
    }

    private writeBuffer(buffer: Buffer): void {
        // Buffer.from is needed as this.buf.subarray can return plain Uint8Array in browser
        this.buf = Buffer.concat([
            Buffer.from(this.buf.subarray(0, this.length)),
            buffer,
            Buffer.alloc(INITIAL_LENGTH),
        ]);
        this.length += buffer.length;
    }

    public writeString(str: string): void {
        this.maybeResize();
        const b = Buffer.from(str, 'utf8');
        this.writeU32(b.length);
        this.writeBuffer(b);
    }

    public writeFixedArray(array: Uint8Array): void {
        this.writeBuffer(Buffer.from(array));
    }

    public writeArray(array: any[], fn: any): void {
        this.maybeResize();
        this.writeU32(array.length);
        for (const elem of array) {
            this.maybeResize();
            fn(elem);
        }
    }

    public toArray(): Uint8Array {
        return this.buf.subarray(0, this.length);
    }
}

function handlingRangeError(
    target: any,
    propertyKey: string,
    propertyDescriptor: PropertyDescriptor
): any {
    const originalMethod = propertyDescriptor.value;
    propertyDescriptor.value = function (...args: any[]): any {
        try {
            return originalMethod.apply(this, args);
        } catch (e) {
            if (e instanceof RangeError) {
                const code = (e as any).code;
                if (
                    ['ERR_BUFFER_OUT_OF_BOUNDS', 'ERR_OUT_OF_RANGE'].indexOf(code) >= 0
                ) {
                    throw new BorshError('Reached the end of buffer when deserializing');
                }
            }
            throw e;
        }
    };
}

export class BinaryReader {
    buf: Buffer;
    offset: number;

    public constructor(buf: Buffer) {
        this.buf = buf;
        this.offset = 0;
    }

    @handlingRangeError
    readU8(): number {
        const value = this.buf.readUInt8(this.offset);
        this.offset += 1;
        return value;
    }

    @handlingRangeError
    readU16(): number {
        const value = this.buf.readUInt16LE(this.offset);
        this.offset += 2;
        return value;
    }

    @handlingRangeError
    readU32(): number {
        const value = this.buf.readUInt32LE(this.offset);
        this.offset += 4;
        return value;
    }

    @handlingRangeError
    readU64(): BN {
        const buf = this.readBuffer(8);
        return new BN(buf, 'le');
    }

    @handlingRangeError
    readU128(): BN {
        const buf = this.readBuffer(16);
        return new BN(buf, 'le');
    }

    @handlingRangeError
    readU256(): BN {
        const buf = this.readBuffer(32);
        return new BN(buf, 'le');
    }

    @handlingRangeError
    readU512(): BN {
        const buf = this.readBuffer(64);
        return new BN(buf, 'le');
    }

    private readBuffer(len: number): Buffer {
        if (this.offset + len > this.buf.length) {
            throw new BorshError(`Expected buffer length ${len} isn't within bounds`);
        }
        const result = this.buf.slice(this.offset, this.offset + len);
        this.offset += len;
        return result;
    }

    @handlingRangeError
    readString(): string {
        const len = this.readU32();
        const buf = this.readBuffer(len);
        try {
            // NOTE: Using TextDecoder to fail on invalid UTF-8
            return textDecoder.decode(buf);
        } catch (e) {
            throw new BorshError(`Error decoding UTF-8 string: ${e}`);
        }
    }

    @handlingRangeError
    readFixedArray(len: number): Uint8Array {
        return new Uint8Array(this.readBuffer(len));
    }

    @handlingRangeError
    readArray(fn: any): any[] {
        const len = this.readU32();
        const result = Array<any>();
        for (let i = 0; i < len; ++i) {
            result.push(fn());
        }
        return result;
    }
}

function capitalizeFirstLetter(string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function serializeField(
    schema: ObjectSchema,
    fieldName: string,
    value: any,
    writer: any
): void {
    try {
        // TODO: Handle missing values properly (make sure they never result in just skipped write)
        const fieldType = schema;
        if (typeof fieldType === 'string') {
            writer[`write${capitalizeFirstLetter(fieldType)}`](value);
        } else if (fieldType instanceof Array) {
            if (typeof fieldType[0] === 'number') {
                if (value.length !== fieldType[0]) {
                    throw new BorshError(
                        `Expecting byte array of length ${fieldType[0]}, but got ${value.length} bytes`
                    );
                }
                writer.writeFixedArray(value);
            } else if (fieldType.length === 2 && typeof fieldType[1] === 'number') {
                if (value.length !== fieldType[1]) {
                    throw new BorshError(
                        `Expecting array of length ${fieldType[1]}, but got ${value.length} items`
                    );
                }
                for (let i = 0; i < fieldType[1]; i++) {
                    serializeField(fieldType[0], null, value[i], writer);
                }
            } else {
                writer.writeArray(value, (item: any) => {
                    serializeField(fieldType[0], fieldName, item, writer);
                });
            }
        } else if (fieldType.kind !== undefined) {
            switch (fieldType.kind) {
            case 'option': {
                if (value === null || value === undefined) {
                    writer.writeU8(0);
                } else {
                    writer.writeU8(1);
                    serializeField(fieldType.type, fieldName, value, writer);
                }
                break;
            }
            case 'map': {
                writer.writeU32(value.size);
                value.forEach((val, key) => {
                    serializeField(fieldType.key, fieldName, key, writer);
                    serializeField(fieldType.value, fieldName, val, writer);
                });
                break;
            }
            default:
                throw new BorshError(`FieldType ${fieldType} unrecognized`);
            }
        } else {
            serializeStruct(schema, value, writer);
        }
    } catch (error) {
        if (error instanceof BorshError) {
            error.addToFieldPath(fieldName);
        }
        throw error;
    }
}

function serializeStruct(schema: ObjectSchema, obj: any, writer: BinaryWriter): void {
    if (typeof obj.borshSerialize === 'function') {
        obj.borshSerialize(writer);
        return;
    }

    if (typeof schema !== 'object' || Array.isArray(schema)) {
        throw new BorshError(`Schema for object value also must be an object`);
    }

    if (schema.enum) {
        const keys = Object.keys(obj);
        if (keys.length !== 1) {
            throw new BorshError(`Enum must have exactly one field, but it had such fields: ${keys}`);
        }
        const name = keys[0];
        const idx = Object.keys(schema).indexOf(name) - 1; // -1 because of enum field
        if (idx < 0) {
            throw new BorshError(`Enum variant ${name} not found in schema`);
        }
        writer.writeU8(idx);
        serializeField(schema[name], name, obj[name], writer);
    } else {
        Object.keys(schema).map((fieldName) => {
            serializeField(schema[fieldName], fieldName, obj[fieldName], writer);
        });
    }
}

/// Serialize given object using schema
export function serialize(
    schema: ObjectSchema,
    obj: any,
    Writer = BinaryWriter
): Uint8Array {
    const writer = new Writer();
    serializeStruct(schema, obj, writer);
    return writer.toArray();
}

function deserializeField(
    schema: ObjectSchema,
    fieldName: string,
    reader: BinaryReader
): any {
    try {
        const fieldType = schema;
        if (typeof fieldType === 'string') {
            return reader[`read${capitalizeFirstLetter(fieldType)}`]();
        }

        if (fieldType instanceof Array) {
            if (typeof fieldType[0] === 'number') {
                return reader.readFixedArray(fieldType[0]);
            } else if (typeof fieldType[1] === 'number') {
                const arr = [];
                for (let i = 0; i < fieldType[1]; i++) {
                    arr.push(deserializeField(fieldType[0], null, reader));
                }
                return arr;
            } else {
                return reader.readArray(() => deserializeField(fieldType[0], fieldName, reader));
            }
        }

        if (fieldType.kind === 'option') {
            const option = reader.readU8();
            if (option) {
                return deserializeField(fieldType.type, fieldName, reader);
            }

            return undefined;
        }
        if (fieldType.kind === 'map') {
            const map = new Map();
            const length = reader.readU32();
            for (let i = 0; i < length; i++) {
                const key = deserializeField(fieldType.key, fieldName, reader);
                const val = deserializeField(fieldType.value, fieldName, reader);
                map.set(key, val);
            }
            return map;
        }

        return deserializeStruct(schema, reader);
    } catch (error) {
        if (error instanceof BorshError) {
            error.addToFieldPath(fieldName);
        }
        throw error;
    }
}

function deserializeStruct(
    schema: ObjectSchema,
    reader: BinaryReader
): any {
    if (typeof schema.borshDeserialize === 'function') {
        return schema.borshDeserialize(reader);
    }

    const structSchema = schema;

    if (structSchema.enum) {
        const idx = reader.readU8();
        if (idx >= structSchema.values.length) {
            throw new BorshError(`Enum index: ${idx} is out of range`);
        }
        const keys = Object.keys(structSchema);
        const fieldName = keys[idx + 1];
        if (!fieldName) {
            throw new BorshError(`Enum index: ${idx} is out of range, enum schema has only these fields ${keys}`);
        }
        const fieldValue = deserializeField(schema[fieldName], fieldName, reader);
        return ({ [fieldName]: fieldValue });
    } else {
        // TODO: Check if schema is a struct?
        const result = {};
        Object.keys(structSchema).map((fieldName) => {
            result[fieldName] = deserializeField(structSchema[fieldName], fieldName, reader);
        });
        return result;
    }
}

/// Deserializes object from bytes using schema.
export function deserialize<T>(
    schema: ObjectSchema,
    buffer: Buffer,
    Reader = BinaryReader
): T {
    const reader = new Reader(buffer);
    const result = deserializeStruct(schema, reader);
    if (reader.offset < buffer.length) {
        throw new BorshError(
            `Unexpected ${buffer.length - reader.offset
            } bytes after deserialized data`
        );
    }
    return result;
}

/// Deserializes object from bytes using schema, without checking the length read
export function deserializeUnchecked<T>(
    schema: ObjectSchema,
    buffer: Buffer,
    Reader = BinaryReader
): T {
    const reader = new Reader(buffer);
    return deserializeStruct(schema, reader);
}
