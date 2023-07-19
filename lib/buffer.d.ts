import { NumberType } from './types';
export declare class EncodeBuffer {
    offset: number;
    buffer_size: number;
    buffer: ArrayBuffer;
    view: DataView;
    resize_if_necessary(needed_space: number): void;
    get_used_buffer(): Uint8Array;
    store_value(value: number, type: NumberType): void;
    store_bytes(from: Uint8Array): void;
}
