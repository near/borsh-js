import { toBigIntLE, writeBufferLEBigInt, writeUInt32LE, readUInt32LE, readUInt16LE, writeUInt16LE, readBigUInt64LE, readUIntLE, checkInt, writeBigUint64Le } from './bigint.js';
import { BorshError } from "./error.js";
import utf8 from '@protobufjs/utf8';
import { PrimitiveType, SmallIntegerType } from './types.js';
import { readFloatLE, writeFloatLE, readDoubleLE, writeDoubleLE } from '@protobufjs/float'

const allocUnsafeFn = (): (len: number) => Uint8Array => {
    if ((globalThis as any).Buffer) {
        return (globalThis as any).Buffer.allocUnsafe
    }
    return (len) => new Uint8Array(len);
}
const allocUnsafe = allocUnsafeFn();

const writeStringBufferFnFn: () => ((len: number) => (string: string, buf: Uint8Array, offset: number) => void) = () => {
    if ((globalThis as any).Buffer) {
        return (length: number) => {
            if (length < 48)
                return utf8.write
            return (string: string, buf: Uint8Array, offset: number) => (buf as any).write(string, offset)
        }
    }
    return () => utf8.write
}
const writeStringBufferFn = writeStringBufferFnFn()

const stringLengthFn: () => ((str: string) => number) = () => {
    if ((globalThis as any).Buffer) {
        return ((globalThis as any).Buffer).byteLength
    }
    return utf8.length
}


type ChainedWrite = (() => any) & { next?: ChainedWrite }
export class BinaryWriter {

    totalSize: number;

    private _writes: ChainedWrite;
    private _writesTail: ChainedWrite;
    private _buf: Uint8Array;

    public constructor() {
        this.totalSize = 0;
        this._writes = () => this._buf = allocUnsafe(this.totalSize);
        this._writesTail = this._writes;
    }

    public bool(value: boolean) {
        return BinaryWriter.bool(value, this)
    }

    public static bool(value: boolean, writer: BinaryWriter) {
        let offset = writer.totalSize;
        writer._writes = writer._writes.next = () => writer._buf[offset] = value ? 1 : 0
        writer.totalSize += 1;

    }
    public u8(value: number) {
        return BinaryWriter.u8(value, this)
    }

    public static u8(value: number, writer: BinaryWriter) {
        checkInt(value, 0, 0xff, 1);
        let offset = writer.totalSize;
        writer._writes = writer._writes.next = () => writer._buf[offset] = value
        writer.totalSize += 1;
    }

    public u16(value: number) {
        return BinaryWriter.u16(value, this)
    }

    public static u16(value: number, writer: BinaryWriter) {
        let offset = writer.totalSize;
        writer._writes = writer._writes.next = () => writeUInt16LE(value, writer._buf, offset);
        writer.totalSize += 2;
    }

    public u32(value: number) {
        return BinaryWriter.u32(value, this)
    }

    public static u32(value: number, writer: BinaryWriter) {
        let offset = writer.totalSize;
        writer._writes = writer._writes.next = () => writeUInt32LE(value, writer._buf, offset)
        writer.totalSize += 4;

    }


    public u64(value: number | bigint) {
        return BinaryWriter.u64(value, this)
    }

    public static u64(value: number | bigint, writer: BinaryWriter) {
        let offset = writer.totalSize;
        writer._writes = writer._writes.next = () => writeBigUint64Le(value, writer._buf, offset)
        writer.totalSize += 8;
    }

    public u128(value: number | bigint) {
        return BinaryWriter.u128(value, this)
    }

    public static u128(value: number | bigint, writer: BinaryWriter) {
        let offset = writer.totalSize;
        writer._writes = writer._writes.next = () => writeBufferLEBigInt(value, 16, writer._buf, offset)
        writer.totalSize += 16;

    }


    public u256(value: number | bigint) {
        return BinaryWriter.u256(value, this)
    }

    public static u256(value: number | bigint, writer: BinaryWriter) {

        let offset = writer.totalSize;
        writer._writes = writer._writes.next = () => writeBufferLEBigInt(value, 32, writer._buf, offset)
        writer.totalSize += 32;

    }

    public u512(value: number | bigint) {
        return BinaryWriter.u512(value, this)
    }

    public static u512(value: number | bigint, writer: BinaryWriter) {
        let offset = writer.totalSize;
        writer._writes = writer._writes.next = () => writeBufferLEBigInt(value, 64, writer._buf, offset)
        writer.totalSize += 64;

    }

    public f32(value: number) {
        return BinaryWriter.f32(value, this)
    }

    public static f32(value: number, writer: BinaryWriter) {
        if (Number.isNaN(value)) {
            throw new BorshError("NaN is not supported for f32")
        }
        let offset = writer.totalSize;
        writer._writes = writer._writes.next = () => writeFloatLE(value, writer._buf, offset)
        writer.totalSize += 4;
    }

    public f64(value: number) {
        return BinaryWriter.f64(value, this)
    }

    public static f64(value: number, writer: BinaryWriter) {
        if (Number.isNaN(value)) {
            throw new BorshError("NaN is not supported for f64")
        }
        let offset = writer.totalSize;
        writer._writes = writer._writes.next = () => writeDoubleLE(value, writer._buf, offset)
        writer.totalSize += 8;
    }

    public string(str: string) {
        return BinaryWriter.string(str, this)
    }

    public static string(str: string, writer: BinaryWriter) {
        const len = stringLengthFn()(str);
        let offset = writer.totalSize;
        writer._writes = writer._writes.next = () => {
            writeUInt32LE(len, writer._buf, offset);
            writeStringBufferFn(len)(str, writer._buf, offset + 4);
        }
        writer.totalSize += 4 + len;
    }

    public static stringCustom(str: string, writer: BinaryWriter, lengthWriter: (len: number | bigint, buf: Uint8Array, offset: number) => void = writeUInt32LE, lengthSize = 4) {
        const len = utf8.length(str);
        let offset = writer.totalSize;
        writer._writes = writer._writes.next = () => {
            lengthWriter(len, writer._buf, offset)
            writeStringBufferFn(len)(str, writer._buf, offset + lengthSize);
        }

        writer.totalSize += lengthSize + len;
    }

    public set(array: Uint8Array) {
        let offset = this.totalSize;
        this._writes = this._writes.next = () => {
            this._buf.set(array, offset);
        }
        this.totalSize += array.length
    }

    public uint8Array(array: Uint8Array) {
        return BinaryWriter.uint8Array(array, this)

    }

    public static uint8Array(array: Uint8Array, writer: BinaryWriter) {
        let offset = writer.totalSize;
        writer._writes = writer._writes.next = () => {
            writeUInt32LE(array.length, writer._buf, offset)
            writer._buf.set(array, offset + 4);
        }
        writer.totalSize += array.length + 4;
    }

    public static uint8ArrayCustom(array: Uint8Array, writer: BinaryWriter, lengthWriter: (len: number | bigint, buf: Uint8Array, offset: number) => void = writeUInt32LE, lengthSize = 4) {
        let offset = writer.totalSize;
        writer._writes = writer._writes.next = () => {
            lengthWriter(array.length, writer._buf, offset)
            writer._buf.set(array, offset + lengthSize);
        }

        writer.totalSize += array.length + lengthSize;
    }

    public static uint8ArrayFixed(array: Uint8Array, writer: BinaryWriter) {
        let offset = writer.totalSize;
        writer._writes = writer._writes.next = () => {
            writer._buf.set(array, offset);
        }
        writer.totalSize += array.length;

    }


    public static smallNumberEncoding(encoding: SmallIntegerType): [((value: number, buf: Uint8Array, offset: number) => void), number] {
        if (encoding === 'u8') {
            return [(value: number, buf: Uint8Array, offset: number) => buf[offset] = value as number, 1]
        }
        else if (encoding === 'u16') {
            return [writeUInt16LE, 2]
        }
        else if (encoding === 'u32') {
            return [writeUInt32LE, 4]
        }
        else {
            throw new Error("Unsupported encoding: " + encoding)
        }
    }


    public static write(encoding: PrimitiveType): (value: number | bigint | string | boolean | string, writer: BinaryWriter) => void {
        if (encoding === 'u8') {
            return BinaryWriter.u8
        }
        else if (encoding === 'u16') {
            return BinaryWriter.u16
        }
        else if (encoding === 'u32') {
            return BinaryWriter.u32
        }
        else if (encoding === 'u64') {
            return BinaryWriter.u64
        }
        else if (encoding === 'u128') {
            return BinaryWriter.u128
        }
        else if (encoding === 'u256') {
            return BinaryWriter.u256
        }
        else if (encoding === 'u512') {
            return BinaryWriter.u512
        }
        else if (encoding === 'bool') {
            return BinaryWriter.bool
        }
        else if (encoding === 'f32') {
            return BinaryWriter.f32
        }
        else if (encoding === 'f64') {
            return BinaryWriter.f64
        }
        else if (encoding === 'string') {
            return BinaryWriter.string
        }
        else {
            throw new Error("Unsupported encoding: " + encoding)
        }
    }

    public finalize(): Uint8Array {
        let current: ChainedWrite = this._writesTail;
        while (current != null) {
            current()
            current = current.next
        }
        return this._buf;
    }
}



export class BinaryReader {
    _buf: Uint8Array;
    _offset: number;

    public constructor(buf: Uint8Array) {
        this._buf = buf;
        this._offset = 0;
    }

    bool(): boolean {
        return BinaryReader.bool(this)
    }

    static bool(reader: BinaryReader): boolean {
        const value = reader._buf[reader._offset];
        reader._offset += 1;
        if (value !== 1 && value !== 0) {
            throw new BorshError("Unexpected value for boolean: " + value + ". Expecting either 1 or 0 ")
        }
        return value ? true : false;
    }

    u8(): number {
        return BinaryReader.u8(this)
    }

    static u8(reader: BinaryReader): number {
        if (reader._offset >= reader._buf.length) {
            throw new BorshError("Reader out of bounds")
        }

        const value = reader._buf[reader._offset];
        reader._offset += 1;
        return value;
    }

    u16(): number {
        return BinaryReader.u16(this)
    }

    static u16(reader: BinaryReader): number {
        const value = readUInt16LE(reader._buf, reader._offset);
        reader._offset += 2;
        return value;
    }


    u32(): number {
        return BinaryReader.u32(this)
    }

    static u32(reader: BinaryReader): number {
        const value = readUInt32LE(reader._buf, reader._offset);
        reader._offset += 4;
        return value;
    }

    u64(): bigint {
        return BinaryReader.u64(this)
    }

    static u64(reader: BinaryReader): bigint {
        const value = readBigUInt64LE(reader._buf, reader._offset);
        reader._offset += 8;
        return value
    }

    u128(): bigint {
        return BinaryReader.u128(this)

    }
    static u128(reader: BinaryReader): bigint {
        const value = readUIntLE(reader._buf, reader._offset, 16);
        reader._offset += 16;
        return value
    }
    u256(): bigint {
        return BinaryReader.u256(this)
    }

    static u256(reader: BinaryReader): bigint {
        const value = readUIntLE(reader._buf, reader._offset, 32);
        reader._offset += 32;
        return value
    }

    u512(): bigint {
        return BinaryReader.u512(this)
    }

    static u512(reader: BinaryReader): bigint {
        const buf = reader.buffer(64);
        return toBigIntLE(buf)
    }


    f32(): number {
        return BinaryReader.f32(this)
    }


    static f32(reader: BinaryReader): number {
        const value = readFloatLE(reader._buf, reader._offset)
        reader._offset += 4;
        if (Number.isNaN(value)) {
            throw new BorshError("Recieved NaN reading f32")
        }
        return value;
    }


    f64(): number {
        return BinaryReader.f64(this)
    }

    static f64(reader: BinaryReader): number {
        const value = readDoubleLE(reader._buf, reader._offset)
        reader._offset += 8;
        if (Number.isNaN(value)) {
            throw new BorshError("Recieved NaN reading f64")
        }
        return value;
    }


    string(): string {
        return BinaryReader.string(this);
    }

    static string(reader: BinaryReader): string {
        const len = reader.u32();
        const end = reader._offset + len;
        if (end > reader._buf.length) {
            throw new BorshError("Error decoding UTF-8 string: Invalid length")
        }

        try {
            const string = utf8.read(reader._buf, reader._offset, end);
            reader._offset = end;
            return string;
        } catch (e) {
            throw new BorshError(`Error decoding UTF-8 string: ${e}`);
        }
    }

    static bufferString(reader: BinaryReader): string {
        const len = reader.u32();
        const end = reader._offset + len;
        if (end > reader._buf.length) {
            throw new BorshError("Error decoding UTF-8 string: Invalid length")
        }

        const string = (reader._buf as Buffer).toString(undefined, reader._offset, end);
        reader._offset = end;
        return string;
    }


    static bufferStringCustom(reader: BinaryReader, length: (reader: BinaryReader) => number): string {
        const len = length(reader);
        const end = reader._offset + len;
        if (end > reader._buf.length) {
            throw new BorshError("Error decoding UTF-8 string: Invalid length")
        }

        try {

            const string = (reader._buf as Buffer).toString(undefined, reader._offset, end);
            reader._offset = end;
            return string;
        } catch (e) {
            throw new BorshError(`Error decoding UTF-8 string: ${e}`);
        }
    }

    static stringCustom(reader: BinaryReader, length: (reader: BinaryReader) => number): string {
        const len = length(reader);
        const end = reader._offset + len;
        if (end > reader._buf.length) {
            throw new BorshError("Error decoding UTF-8 string: Invalid length")
        }

        try {
            const string = utf8.read(reader._buf, reader._offset, end);
            reader._offset = end;
            return string;
        } catch (e) {
            throw new BorshError(`Error decoding UTF-8 string: ${e}`);
        }
    }

    public static read(encoding: PrimitiveType, fromBuffer?: boolean): ((reader: BinaryReader) => number) | ((reader: BinaryReader) => bigint) | ((reader: BinaryReader) => boolean) | ((reader: BinaryReader) => string) {
        if (encoding === 'u8') {
            return BinaryReader.u8
        }
        else if (encoding === 'u16') {
            return BinaryReader.u16
        }
        else if (encoding === 'u32') {
            return BinaryReader.u32
        }
        else if (encoding === 'u64') {
            return BinaryReader.u64
        }
        else if (encoding === 'u128') {
            return BinaryReader.u128
        }
        else if (encoding === 'u256') {
            return BinaryReader.u256
        }
        else if (encoding === 'u512') {
            return BinaryReader.u512
        }
        else if (encoding === 'string') {
            return fromBuffer ? BinaryReader.bufferString : BinaryReader.string
        }
        else if (encoding === 'bool') {
            return BinaryReader.bool
        }
        else if (encoding === 'f32') {
            return BinaryReader.f32
        }
        else if (encoding === 'f64') {
            return BinaryReader.f64
        }
        else {
            throw new Error("Unsupported encoding: " + encoding)
        }
    }

    public buffer(len: number): Uint8Array {
        const end = this._offset + len;
        const result = this._buf.subarray(this._offset, end);
        this._offset = end;
        return result;
    }


    uint8Array(): Uint8Array {
        return BinaryReader.uint8Array(this)
    }

    static uint8Array(reader: BinaryReader, size = reader.u32()): Uint8Array {
        return reader.buffer(size);
    }


    readArray(fn: any): any[] {
        const len = this.u32();
        const result = new Array<any>(len);
        for (let i = 0; i < len; ++i) {
            result[i] = fn();
        }
        return result;
    }
}