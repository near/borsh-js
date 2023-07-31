import { BorshSerializer } from './serialize';
import { BorshDeserializer } from './deserialize';
import * as utils from './utils';
import bs58 from 'bs58';
export function serialize(schema, value, checkSchema) {
    if (checkSchema === void 0) { checkSchema = true; }
    if (checkSchema)
        utils.validate_schema(schema);
    var serializer = new BorshSerializer();
    return serializer.encode(value, schema);
}
export function deserialize(schema, buffer, checkSchema) {
    if (checkSchema === void 0) { checkSchema = true; }
    if (checkSchema)
        utils.validate_schema(schema);
    var deserializer = new BorshDeserializer(buffer);
    return deserializer.decode(schema);
}
// Keeping this for compatibility reasons with the old borsh-js
export function baseEncode(value) {
    if (typeof value === 'string') {
        var bytes = [];
        for (var c = 0; c < value.length; c++) {
            bytes.push(value.charCodeAt(c));
        }
        value = new Uint8Array(bytes);
    }
    return bs58.encode(value);
}
export function baseDecode(value) {
    return new Uint8Array(bs58.decode(value));
}
