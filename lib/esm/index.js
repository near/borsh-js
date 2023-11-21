import { BorshSerializer } from './serialize';
import { BorshDeserializer } from './deserialize';
import * as utils from './utils';
export function serialize(schema, value, validate) {
    if (validate === void 0) { validate = true; }
    if (validate)
        utils.validate_schema(schema);
    var serializer = new BorshSerializer(validate);
    return serializer.encode(value, schema);
}
export function deserialize(schema, buffer, validate) {
    if (validate === void 0) { validate = true; }
    if (validate)
        utils.validate_schema(schema);
    var deserializer = new BorshDeserializer(buffer);
    return deserializer.decode(schema);
}
