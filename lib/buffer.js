"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncodeBuffer = void 0;
class EncodeBuffer {
    offset = 0;
    buffer_size = 256;
    buffer = new ArrayBuffer(this.buffer_size);
    view = new DataView(this.buffer);
    resize_if_necessary(needed_space) {
        if (this.buffer_size - this.offset < needed_space) {
            this.buffer_size = Math.max(this.buffer_size * 2, this.buffer_size + needed_space);
            const new_buffer = new ArrayBuffer(this.buffer_size);
            new Uint8Array(new_buffer).set(new Uint8Array(this.buffer));
            this.buffer = new_buffer;
            this.view = new DataView(new_buffer);
        }
    }
    get_used_buffer() {
        return new Uint8Array(this.buffer).slice(0, this.offset);
    }
    store_value(value, type) {
        const size = parseInt(type.substring(1)) / 8;
        this.resize_if_necessary(size);
        switch (type) {
            case 'u8':
                this.view.setUint8(this.offset, value);
                break;
            case 'u16':
                this.view.setUint16(this.offset, value, true);
                break;
            case 'u32':
                this.view.setUint32(this.offset, value, true);
                break;
            case 'i8':
                this.view.setInt8(this.offset, value);
                break;
            case 'i16':
                this.view.setInt16(this.offset, value, true);
                break;
            case 'i32':
                this.view.setInt32(this.offset, value, true);
                break;
            case 'f32':
                this.view.setFloat32(this.offset, value, true);
                break;
            case 'f64':
                this.view.setFloat64(this.offset, value, true);
                break;
            default:
                throw new Error(`Unsupported integer type: ${type}`);
        }
        this.offset += size;
    }
    store_bytes(from) {
        this.resize_if_necessary(from.length);
        new Uint8Array(this.buffer).set(new Uint8Array(from), this.offset);
        this.offset += from.length;
    }
}
exports.EncodeBuffer = EncodeBuffer;
// export class DecodeBuffer {
//     public offset: number = 0;
//     public start: usize;
//     constructor(public arrBuffer: ArrayBuffer) {
//         this.start = changetype<usize>(arrBuffer)
//     }
//     consume<T>(): T {
//         const off = this.offset
//         this.offset += sizeof<T>()
//         return load<T>(this.start + off)
//     }
//     consume_slice(length: number): ArrayBuffer {
//         const off = this.offset
//         this.offset += length
//         return changetype<ArrayBuffer>(this.start).slice(off, off + length)
//     }
//     consume_copy(dst: usize, length: number): void {
//         memory.copy(dst, this.start + this.offset, length);
//         this.offset += length;
//     }
// }
