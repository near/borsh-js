"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecodeBuffer = exports.EncodeBuffer = void 0;
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
        const bSize = type.substring(1);
        const size = parseInt(bSize) / 8;
        this.resize_if_necessary(size);
        const toCall = type[0] === 'f' ? `setFloat${bSize}` : type[0] === 'i' ? `setInt${bSize}` : `setUint${bSize}`;
        this.view[toCall](this.offset, value, true);
        this.offset += size;
    }
    store_bytes(from) {
        this.resize_if_necessary(from.length);
        new Uint8Array(this.buffer).set(new Uint8Array(from), this.offset);
        this.offset += from.length;
    }
}
exports.EncodeBuffer = EncodeBuffer;
class DecodeBuffer {
    offset = 0;
    buffer_size = 256;
    buffer;
    view;
    constructor(buf) {
        this.buffer = new ArrayBuffer(buf.length);
        new Uint8Array(this.buffer).set(buf);
        this.view = new DataView(this.buffer);
    }
    assert_enough_buffer(size) {
        if (this.offset + size > this.buffer.byteLength) {
            throw new Error('Error in schema, the buffer is smaller than expected');
        }
    }
    consume_value(type) {
        const bSize = type.substring(1);
        const size = parseInt(bSize) / 8;
        this.assert_enough_buffer(size);
        const toCall = type[0] === 'f' ? `getFloat${bSize}` : type[0] === 'i' ? `getInt${bSize}` : `getUint${bSize}`;
        const ret = this.view[toCall](this.offset, true);
        this.offset += size;
        return ret;
    }
    consume_bytes(size) {
        this.assert_enough_buffer(size);
        const ret = this.buffer.slice(this.offset, this.offset + size);
        this.offset += size;
        return ret;
    }
}
exports.DecodeBuffer = DecodeBuffer;
