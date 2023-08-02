import { BorshSerializer } from './serialize.js';
import { BorshDeserializer } from './deserialize.js';
import * as utils from './utils.js';
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
