function arrayToHex(arr: Uint8Array, reverse: boolean = false): string {
    return [...(reverse ? new Uint8Array(arr).reverse() : new Uint8Array(arr))]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

export function toBigIntLE(buf: Uint8Array): bigint {
    const hex = arrayToHex(buf, true);
    if (hex.length === 0) {
        return BigInt(0);
    }
    return BigInt(`0x${hex}`);
}

export function writeBufferLEBigInt(num: bigint | number, width: number, buffer: Uint8Array, offset: number) {
    const hex = num.toString(16);
    const padded = hex.padStart(width * 2, '0').slice(0, width * 2);
    for (const [ix, value] of padded.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)).entries()) {
        buffer[offset + width - 1 - ix] = value;
    }
}

export function writeUInt32LE(value: number, buf: Uint8Array, offset: number) {
    checkInt(value, 0, 0xffffffff, 3);
    buf[offset] = value;
    buf[offset + 1] = value >>> 8;
    buf[offset + 2] = value >>> 16;
    buf[offset + 3] = value >>> 24;
}


export function writeUInt16LE(value: number, buf: Uint8Array, offset: number) {
    checkInt(value, 0, 0xffff, 1);
    buf[offset] = value;
    buf[offset + 1] = (value >>> 8);
}

export const writeBigUint64Le = (bigIntOrNumber: bigint | number, buf: Uint8Array, offset: number) => {
    let lo, hi;
    if (typeof bigIntOrNumber === 'bigint') {
        if (bigIntOrNumber <= Number.MAX_SAFE_INTEGER) {
            if (bigIntOrNumber < 0) {
                throw new Error("u64 value can not negative, got " + bigIntOrNumber)
            }
            bigIntOrNumber = Number(bigIntOrNumber)
            lo = bigIntOrNumber >>> 0;
            hi = (bigIntOrNumber - lo) / 4294967296;
        }
        else {
            if (bigIntOrNumber > 18446744073709551615n) {
                throw new Error("u64 value can exceed mav value got " + bigIntOrNumber)
            }
            lo = Number(bigIntOrNumber & 4294967295n);
            hi = Number(bigIntOrNumber >> 32n & 4294967295n);
        }

    }
    else {
        if (bigIntOrNumber < 0 || bigIntOrNumber > 18446744073709551615n) {
            throw new Error("u64 value can not negative, got " + bigIntOrNumber)
        }
        // We don't need upper bound check because number can not exceed 18446744073709551615
        lo = bigIntOrNumber >>> 0;
        hi = (bigIntOrNumber - lo) / 4294967296;
    }

    buf[offset] = lo;
    buf[offset + 1] = lo >>> 8;
    buf[offset + 2] = lo >>> 16;
    buf[offset + 3] = lo >>> 24;
    buf[offset + 4] = hi;
    buf[offset + 5] = hi >>> 8;
    buf[offset + 6] = hi >>> 16;
    buf[offset + 7] = hi >>> 24;

}

export const readBigUInt64LE = (buf: Uint8Array, offset: number) => {
    const first = buf[offset];
    const last = buf[offset + 7];
    if (first === undefined || last === undefined)
        throw new Error('Out of bounds');

    let lo = (first | buf[offset + 1] << 8 | buf[offset + 2] << 16 | buf[offset + 3] << 24) >>> 0;
    let hi = (buf[offset + 4] | buf[offset + 5] << 8 | buf[offset + 6] << 16 | last << 24) >>> 0;
    if (hi > 0) {
        return BigInt(lo) + (BigInt(hi) << 32n);
    }
    return BigInt(lo)
}

export function readUIntLE(buf: Uint8Array, offset: number, width: number): bigint {
    const hex = arrayToHex(buf.subarray(offset, offset + width), true);
    if (hex.length === 0) {
        return BigInt(0);
    }
    return BigInt(`0x${hex}`);
}




export const readUInt32LE = (buffer: Uint8Array, offset: number) => {
    const first = buffer[offset];
    const last = buffer[offset + 3];
    if (first === undefined || last === undefined)
        throw new Error('Out of bounds');

    return first +
        buffer[offset + 1] * 2 ** 8 +
        buffer[offset + 2] * 2 ** 16 +
        last * 2 ** 24;
}


export const readUInt16LE = (buffer: Uint8Array, offset: number) => {
    const first = buffer[offset];
    const last = buffer[offset + 1];
    if (first === undefined || last === undefined)
        throw new Error('Out of bounds');

    return first + last * 2 ** 8;
}



export const checkInt = (value: number | bigint, min: number | bigint, max: number | bigint, byteLength: number) => {
    if (value > max || value < min) {
        const n = typeof min === 'bigint' ? 'n' : '';
        let range;
        if (byteLength > 3) {
            if (min === 0 || min === 0n) {
                range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`;
            } else {
                range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and < 2 ** ` +
                    `${(byteLength + 1) * 8 - 1}${n}`;
            }
        } else {
            range = `>= ${min}${n} and <= ${max}${n}`;
        }
        throw new Error("Out of range value: " + range + ", " + value);
    }
}