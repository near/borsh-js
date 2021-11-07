"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSchemas = exports.Field = exports.Variant = void 0;
require("reflect-metadata");
const _1 = require(".");
const error_1 = require("./error");
const STRUCT_META_DATA_SYMBOL = '__borsh_struct_metadata__';
const structMetaDataKey = (constructorName) => {
    return STRUCT_META_DATA_SYMBOL + constructorName;
};
/**
 *
 * @param kind 'struct' or 'variant. 'variant' equivalnt to Rust Enum
 * @returns Schema decorator function for classes
 */
exports.Variant = (index) => {
    return (ctor) => {
        // Create a custom serialization, for enum by prepend instruction index
        ctor.prototype.borshSerialize = function (schema, writer) {
            writer.writeU8(index);
            // Serialize content as struct, we do not invoke serializeStruct since it will cause circular calls to this method
            const structSchema = schema.get(ctor);
            for (const [fieldName, fieldType] of structSchema.fields) {
                _1.serializeField(schema, fieldName, this[fieldName], fieldType, writer);
            }
        };
    };
};
/**
 * @param properties, the properties of the field mapping to schema
 * @returns
 */
function Field(properties) {
    return (target, name) => {
        const metaDataKey = structMetaDataKey(target.constructor.name);
        let schema = Reflect.getMetadata(metaDataKey, target.constructor); // Assume StructKind already exist
        const key = name.toString();
        if (!schema) {
            schema = {
                fields: [],
                kind: 'struct',
                dependencies: new Set()
            };
        }
        if (typeof properties.type === 'function') // struct
         {
            schema.dependencies.add(properties.type);
        }
        let fieldInfo = undefined;
        if (properties.option) {
            fieldInfo = [key, {
                    kind: 'option',
                    type: properties.type
                }]; // Convert to array type
        }
        else {
            fieldInfo = [key, properties.type];
        }
        if (properties.index === undefined) {
            schema.fields.push(fieldInfo); // add to the end. This will make property decorator execution order define field order
        }
        else {
            if (schema.fields[properties.index]) {
                throw new error_1.BorshError("Multiple fields defined at the same index: " + properties.index + ", class: " + target.constructor.name);
            }
            if (properties.index >= schema.fields.length) {
                resize(schema.fields, properties.index + 1, undefined);
            }
            schema.fields[properties.index] = fieldInfo;
        }
        Reflect.defineMetadata(metaDataKey, schema, target.constructor);
    };
}
exports.Field = Field;
/**
 * @param clazzes
 * @param validate, run validation?
 * @returns Schema map
 */
exports.generateSchemas = (clazzes, validate) => {
    let ret = new Map();
    let dependencies = new Set();
    clazzes.forEach((clazz) => {
        let schema = Reflect.getMetadata(structMetaDataKey(clazz.name), clazz);
        if (schema) {
            if (validate) {
                validateSchema(schema);
            }
            ret.set(clazz, {
                fields: schema.fields,
                kind: schema.kind
            });
            schema.dependencies.forEach((dependency) => {
                dependencies.add(dependency);
            });
        }
    });
    // Generate schemas for nested types
    dependencies.forEach((dependency) => {
        if (!ret.has(dependency)) {
            const dependencySchema = exports.generateSchemas([dependency], validate);
            dependencySchema.forEach((value, key) => {
                ret.set(key, value);
            });
        }
    });
    return new Map(ret);
};
const validateSchema = (structSchema) => {
    structSchema.fields.forEach((field) => {
        if (!field) {
            throw new error_1.BorshError("Field is missing definition, most likely due to field indexing with missing indices");
        }
    });
};
const resize = (arr, newSize, defaultValue) => {
    while (newSize > arr.length)
        arr.push(defaultValue);
    arr.length = newSize;
};
