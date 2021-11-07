"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSchema = exports.Field = exports.getSuperClasses = exports.Variant = void 0;
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
exports.getSuperClasses = (targetClass) => {
    const ret = [];
    if (targetClass instanceof Function) {
        let baseClass = targetClass;
        while (baseClass) {
            const newBaseClass = Object.getPrototypeOf(baseClass);
            if (newBaseClass && newBaseClass !== Object && newBaseClass.name) {
                baseClass = newBaseClass;
                ret.push(newBaseClass.name);
            }
            else {
                break;
            }
        }
    }
    return ret;
};
function Field(fieldInfoPartial) {
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
        if (typeof fieldInfoPartial.type === 'function') // struct
         {
            schema.dependencies.add(fieldInfoPartial.type);
        }
        let fieldInfo = undefined;
        if (fieldInfoPartial.option) {
            fieldInfo = [key, {
                    kind: 'option',
                    type: fieldInfoPartial.type
                }]; // Convert to array type
        }
        else {
            fieldInfo = [key, fieldInfoPartial.type];
        }
        if (fieldInfoPartial.index === undefined) {
            schema.fields.push(fieldInfo); // add to the end. This will make property decorator execution order define field order
        }
        else {
            if (schema.fields[fieldInfoPartial.index]) {
                throw new error_1.BorshError("Multiple fields defined at the same index: " + fieldInfoPartial.index + ", class: " + target.constructor.name);
            }
            if (fieldInfoPartial.index >= schema.fields.length) {
                resize(schema.fields, fieldInfoPartial.index + 1, undefined);
            }
            schema.fields[fieldInfoPartial.index] = fieldInfo;
        }
        Reflect.defineMetadata(metaDataKey, schema, target.constructor);
    };
}
exports.Field = Field;
/*
const getMergedKindFields = (object:any):Schema =>
{
    const allFields = [];
    getSuperClasses(object.constructor).forEach((clazz)=>
    {
        const fields = (Reflect.getMetadata(fieldMetaDataKey(clazz), object) as KindFields)?.fields;
        if(fields)
            allFields.push(...fields);
    });
    const subClassSchema = (Reflect.getMetadata(fieldMetaDataKey(object.constructor.name), object) as KindFields);
    const ret:KindFields  = {
        fields: [...subClassSchema.fields, ...allFields],
        name: subClassSchema.name,
        id: subClassSchema.id
    }
    return ret;
    
}*/
/*
const validateSchema = (schema:Schema) =>
{
    const fieldKeys = new Set<string>();
    schema.fields.forEach((field) => {
        if(fieldKeys.has(field.key))
        {
            throw new Error('Duplicate field: ' + field.key);
        }
        fieldKeys.add(field.key);
    });
    
}*/
/**
 * @param object
 */
exports.generateSchema = (clazzes, validate) => {
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
            const dependencySchema = exports.generateSchema([dependency], validate);
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
