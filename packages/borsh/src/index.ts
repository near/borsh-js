import {
  FixedArrayKind,
  OptionKind,
  Field,
  StructKind,
  VecKind,
  SimpleField,
  CustomField,
  Constructor,
  AbstractType,
  IntegerType,
  getOffset,
  StringType,
  extendingClasses,
} from "./types.js";
export * from "./binary.js";
export * from "./types.js";
export * from './error.js';
import { BorshError } from "./error.js";
import { BinaryWriter, BinaryReader } from "./binary.js";

/**
 * Code below is quite optimized for performance hence there will be some "wierd" looking .js 
 * Overall, they way it works, is that each Schema is translated into one big callback function that can execute very efficiently multiple time
 * This function or handle, is stored on the prototypes so we can easily access it when we want to serialize/deserialize
 */

// we will store some metadata about the schemas on the prototype. Prototype set get is faster if we use numbers (so we are going to use that here)
const MAX_PROTOTYPE_SEARCH = 250;
const PROTOTYPE_POLLUTION_CONTEXT_RANGE = 500;
const PROTOTYPE_DESERIALIZATION_HANDLER_OFFSET = 500;
const PROTOTYPE_DEPENDENCY_HANDLER_OFFSET = PROTOTYPE_DESERIALIZATION_HANDLER_OFFSET + PROTOTYPE_POLLUTION_CONTEXT_RANGE;
const PROTOTYPE_SCHEMA_OFFSET = PROTOTYPE_DESERIALIZATION_HANDLER_OFFSET + PROTOTYPE_POLLUTION_CONTEXT_RANGE * 2;

/**
 * Serialize an object with @field(...) or @variant(...) decorators
 * @param obj 
 * @returns bytes
 */
export function serialize(
  obj: any,
  writer: BinaryWriter = new BinaryWriter()
): Uint8Array {
  (obj.constructor._borsh_serialize || (obj.constructor._borsh_serialize = serializeStruct(obj.constructor, true)))(obj, writer)
  return writer.finalize();
}

function recursiveSerialize(obj: any, writer: BinaryWriter = new BinaryWriter()) {
  (obj.constructor._borsh_serialize_recursive || (obj.constructor._borsh_serialize_recursive = serializeStruct(obj.constructor, false)))(obj, writer)
  return writer.finalize();
}


/**
 * /// Deserializes object from bytes using schema.
 * @param buffer data
 * @param classType target Class
 * @param options options
 * @param options.unchecked if true then any remaining bytes after deserialization will be ignored 
 * @param options.object no classes will be created, just plain js object
 * @param options.construct if true, constructors will be invoked on deserialization
 * @returns
 */

type DeserializeStructOptions = {
  unchecked?: boolean
} & ({ construct?: boolean } | { object?: boolean });
export function deserialize<T>(
  buffer: Uint8Array,
  classType: Constructor<T> | AbstractType<T>,
  options?: DeserializeStructOptions
): T {
  // buffer = intoUint8Array(buffer);
  const reader = new BinaryReader(buffer);
  let fromBuffer = buffer.constructor !== Uint8Array
  const result = deserializeStruct(classType, fromBuffer)(reader, options);
  if (!options?.unchecked && reader._offset !== buffer.length) {
    throw new BorshError(
      `Unexpected ${buffer.length - reader._offset
      } bytes after deserialized data. This is most likely due to that you are deserializing into the wrong class`
    );
  }
  return result;
}





function serializeField(
  fieldName: string,
  fieldType: any,
  options?: { unchecked: boolean }
): (obj: any, writer: BinaryWriter) => any {
  if (typeof fieldType.serialize == "function") {
    return (obj, writer) => fieldType.serialize(obj, writer);
  }
  try {
    const handleFn = (): (obj: any, writer: BinaryWriter) => any => {
      if (typeof fieldType === "string") {
        return BinaryWriter.write(fieldType as IntegerType)
      }

      else if (fieldType === Uint8Array) {
        return BinaryWriter.uint8Array
      }
      else if (fieldType instanceof OptionKind) {
        const fieldHandle = serializeField(fieldName, fieldType.elementType);

        return (obj, writer) => {
          if (obj != null) {
            writer.u8(1);
            fieldHandle(obj, writer)
          }
          else {
            writer.u8(0)
          }
        }
      }
      else if (
        fieldType instanceof VecKind ||
        fieldType instanceof FixedArrayKind
      ) {

        if (fieldType.elementType === 'u8') {
          if (fieldType instanceof FixedArrayKind) {
            return options?.unchecked ? BinaryWriter.uint8ArrayFixed : (obj, writer) => {
              if (obj.length !== fieldType.length) {
                throw new BorshError(`Provided array does not equal fixed array size of field: ${fieldName}. Recieved: ${obj.length}, Expected: ${fieldType.length}`)
              }
              return BinaryWriter.uint8ArrayFixed(obj, writer)
            }
          }
          else {
            if (fieldType.sizeEncoding === 'u32')
              return BinaryWriter.uint8Array
            else {
              const [sizeHandle, width] = BinaryWriter.smallNumberEncoding(fieldType.sizeEncoding)
              return (obj, writer) => BinaryWriter.uint8ArrayCustom(obj, writer, sizeHandle, width)
            }
          }
        }
        else {
          const sizeHandle = fieldType instanceof FixedArrayKind ? undefined : BinaryWriter.write(fieldType.sizeEncoding)
          const fieldHandle = serializeField(null, fieldType.elementType);;
          return (obj, writer) => {
            let len = obj.length;
            if (!sizeHandle) {
              if ((fieldType as FixedArrayKind).length != len) {
                throw new BorshError(
                  `Expecting array of length ${(fieldType as any)[0]}, but got ${obj.length
                  }`
                );
              }
            } else {
              sizeHandle(len, writer); // For dynamically sized array we write the size as uX according to specification
            }
            for (let i = 0; i < len; i++) {
              fieldHandle(obj[i], writer)
            }
          }
        }

      }
      else if (fieldType instanceof StringType) {
        const [sizeHandle, width] = BinaryWriter.smallNumberEncoding(fieldType.sizeEncoding)
        return (obj, writer) => BinaryWriter.stringCustom(obj, writer, sizeHandle, width)
      }


      else {
        return (obj, writer) => {
          if (!options?.unchecked && !checkClazzesCompatible(obj.constructor, fieldType)) {
            throw new BorshError(`Field value of field ${fieldName} is not instance of expected Class ${getSuperMostClass(fieldType)?.name}. Got: ${obj.constructor.name}`)
          }
          serializeStruct(obj.constructor)(obj, writer)
        }
      }
    }

    const handle = handleFn()

    if (!options?.unchecked) {
      return (obj: any, writer: BinaryWriter) => {
        if (obj == null && fieldType instanceof OptionKind === false) {
          throw new BorshError(`Trying to serialize a null value to field "${fieldName}" which is not allowed since the field is not decorated with "option(...)" but "${typeof fieldType === 'function' && fieldType?.name ? fieldType?.name : fieldType}". Most likely you have forgotten to assign this value before serializing`)
        }
        return handle(obj, writer)
      }
    }
    else {
      return handle;

    }
  } catch (error) {
    if (error instanceof BorshError) {
      error.addToFieldPath(fieldName);
    }
    throw error;
  }
}


function serializeStruct(
  ctor: Function,
  allowCustomSerializer = true
) {
  let handle: (obj: any, writer: BinaryWriter) => any = undefined;
  var i = 0;
  let once = false;
  while (true) {
    let schema = getSchema(ctor, i);
    if (schema) {
      once = true;
      const index = schema.variant;
      if (index != undefined) {
        let prev = handle;

        if (typeof index === "number") {
          handle = prev ? (obj, writer) => { prev(obj, writer); writer.u8(index) } : (_obj, writer) => BinaryWriter.u8(index, writer)
        } else if (Array.isArray(index)) {
          if (prev) {
            handle = (obj, writer) => {
              prev(obj, writer)
              for (const i of index) {
                writer.u8(i);
              }
            }
          }
          else {
            handle = (_obj, writer) => {
              for (const i of index) {
                writer.u8(i);
              }
            }
          }

        }
        else { // is string
          handle = prev ? (obj, writer) => {
            prev(obj, writer);
            writer.string(index);
          } : (_obj, writer) => writer.string(index);
        }
      }
      if (allowCustomSerializer && schema.serializer) {
        let prev = handle;
        handle = prev ? (obj, writer) => {
          prev(obj, writer);
          schema.serializer(obj, writer, (obj: any) => recursiveSerialize(obj))
        } : (obj, writer) => schema.serializer(obj, writer, (obj: any) => recursiveSerialize(obj))
      }
      else {
        for (const field of schema.fields) {
          let prev = handle;
          const fieldHandle = serializeField(field.key, field.type);
          if (prev) {
            handle = (obj, writer) => {
              prev(obj, writer);
              fieldHandle(obj[field.key], writer)
            }
          }
          else {
            handle = (obj, writer) => fieldHandle(obj[field.key], writer)
          }
        }
      }

    }

    else if (once && !getDependencies(ctor, i)?.length) {
      return handle;
    }
    i++;
    if (i == MAX_PROTOTYPE_SEARCH && !once) {
      throw new BorshError(`Class ${ctor.name} is missing in schema`);
    }
  }
}

const MAX_ARRAY_SIZE_ALLOCATION = 1024 * 1024;

function deserializeField(
  fieldName: string,
  fieldType: any,
  fromBuffer: boolean
): (reader: BinaryReader, options: DeserializeStructOptions) => any {
  try {
    if (typeof fieldType === "string") {
      return BinaryReader.read(fieldType as IntegerType, fromBuffer)
    }

    if (fieldType === Uint8Array) {
      return (reader) => reader.uint8Array()
    }

    if (fieldType instanceof VecKind || fieldType instanceof FixedArrayKind) {
      if (fieldType.elementType === 'u8') {
        if (fieldType instanceof FixedArrayKind) {
          return (reader) => reader.buffer(fieldType.length)
        }
        else {
          const sizeHandle = BinaryReader.read(fieldType.sizeEncoding, fromBuffer) as (reader: BinaryReader) => number;
          return (reader) => BinaryReader.uint8Array(reader, sizeHandle(reader))
        }
      }
      else {
        let sizeHandle = fieldType instanceof VecKind ? BinaryReader.read(fieldType.sizeEncoding, fromBuffer) as (reader: BinaryReader) => number : (() => fieldType.length);
        const fieldHandle = deserializeField(null, fieldType.elementType, fromBuffer);
        return (reader, options) => {
          const len = sizeHandle(reader);
          if (len < MAX_ARRAY_SIZE_ALLOCATION) {
            let arr = new Array(len);
            for (let i = 0; i < len; i++) {
              arr[i] = fieldHandle(reader, options);
            }
            return arr;
          }
          else {
            let arr = new Array(MAX_ARRAY_SIZE_ALLOCATION);
            for (let i = 0; i < len; i++) {
              arr[i] = fieldHandle(reader, options);
            }
            return arr;
          }
        }
      }
    }

    if (fieldType instanceof StringType) {
      const sizeReader = BinaryReader.read(fieldType.sizeEncoding, fromBuffer) as (reader: BinaryReader) => number;

      return fromBuffer ? (reader) => BinaryReader.bufferStringCustom(reader, sizeReader) : (reader) => BinaryReader.stringCustom(reader, sizeReader)
    }

    if (typeof fieldType["deserialize"] == "function") {
      return (reader) => fieldType.deserialize(reader);
    }

    if (fieldType instanceof OptionKind) {
      const fieldHandle = deserializeField(
        fieldName,
        fieldType.elementType,
        fromBuffer
      );
      return (reader, options) => {
        return reader.bool() ? fieldHandle(
          reader,
          options
        ) : undefined;
      }
    }
    return deserializeStruct(fieldType, fromBuffer)

  } catch (error) {
    if (error instanceof BorshError) {
      error.addToFieldPath(fieldName);
    }
    throw error;
  }
}
export function deserializeStruct(targetClazz: any, fromBuffer: boolean): (reader: BinaryReader, options?: DeserializeStructOptions) => any {

  const handle = getCreateDeserializationHandle(targetClazz, 0, fromBuffer);
  // "compile time"
  return (reader: BinaryReader, options?: DeserializeStructOptions) => {
    // "runtime" 
    const result = handle({}, reader, options)
    if (!options?.unchecked && !(options as any)?.object && !checkClazzesCompatible(result.constructor, targetClazz)) {
      throw new BorshError(`Deserialization of ${targetClazz?.name || targetClazz} yielded another Class: ${result.constructor?.name} which are not compatible`);
    }
    return result;
  };

}


const getCreateDeserializationHandle = (clazz: any, offset: number, fromBuffer: boolean): (result: any, reader: BinaryReader, options?: DeserializeStructOptions) => any => getDeserializationHandle(clazz, offset, fromBuffer) || setDeserializationHandle(clazz, offset, fromBuffer, createDeserializeStructHandle(clazz, offset, fromBuffer))
const getDeserializationHandle = (clazz: any, offset: number, fromBuffer: boolean) => clazz.prototype[PROTOTYPE_DESERIALIZATION_HANDLER_OFFSET + offset + (fromBuffer ? MAX_PROTOTYPE_SEARCH : 0)]
const setDeserializationHandle = (clazz: any, offset: number, fromBuffer: boolean, handle: (result: any, reader: BinaryReader, options?: DeserializeStructOptions) => any) => clazz.prototype[PROTOTYPE_DESERIALIZATION_HANDLER_OFFSET + offset + (fromBuffer ? MAX_PROTOTYPE_SEARCH : 0)] = handle;
const clearDeserializeStructHandle = (clazz: any, offset: number, fromBuffer: boolean) => delete clazz.prototype[PROTOTYPE_DESERIALIZATION_HANDLER_OFFSET + offset + (fromBuffer ? MAX_PROTOTYPE_SEARCH : 0)]
const createDeserializeStructHandle = (currClazz: Constructor<any>, offset: number, fromBuffer: boolean): ((result: any, reader: BinaryReader, options?: DeserializeStructOptions) => any) => {
  let handle: (result: any, reader: BinaryReader, options?: DeserializeStructOptions) => any | undefined = undefined;
  let endHandle = (result: any, reader: BinaryReader, options: DeserializeStructOptions) => {
    if ((options as any)?.object) {
      return result;
    }
    return Object.assign((options as any)?.construct ? new currClazz() : Object.create(currClazz.prototype), result);
  }
  let structSchema = getSchema(currClazz, offset);
  if (structSchema) {
    if (offset === 0) {
      let index = getVariantIndex(structSchema);
      if (index != null) {
        // It is an (stupid) enum, but we deserialize into its variant directly
        // This means we should omit the variant index
        if (typeof index === "number") {
          handle = (_, reader, __) => {
            reader._offset += 1; // read 1 u
          };
        } else if (Array.isArray(index)) {
          handle = (_, reader, __) => {
            reader._offset += (index as Array<any>).length // read all u8's 1 u8 = 1 byte -> shift offset with 1*length
          };
        }
        else { // string
          handle = (_, reader, __) => {
            reader.string();
          };
        }
      }
    }

    for (const field of structSchema.fields) {
      const prev = handle;
      const fieldHandle = deserializeField(
        field.key,
        field.type,
        fromBuffer
      );
      if (prev) {
        handle = (result, reader: BinaryReader, options?: DeserializeStructOptions) => {
          prev(result, reader, options)
          result[field.key] = fieldHandle(reader,
            options)
        }
      }
      else handle = (result, reader: BinaryReader, options?: DeserializeStructOptions) => {
        result[field.key] = fieldHandle(reader,
          options)
      }


    }
  }

  // We know that we should serialize into the variant that accounts to the first byte of the read
  let dependencies = getAllDependencies(currClazz, offset);
  if (dependencies) {
    let variantToDepndency: [any, any, {
      schema: StructKind;
      offset: number;
    }][] = [];
    let variantType: 'string' | 'number' | number | 'undefined';
    for (const [actualClazz, dependency] of dependencies) {
      const variantIndex = getVariantIndex(dependency.schema);
      let currentVariantType = typeof variantIndex === 'object' ? variantIndex.length : typeof variantIndex as ('string' | 'number');
      if (!variantType) {
        variantType = currentVariantType;
      }
      else if (currentVariantType !== variantType) {
        throw new Error(`Variant extending ${currClazz.name} have different types, expecting either number, number[] (with same sizes) or string, but not a combination of them`)
      }
      variantToDepndency.push([variantIndex, actualClazz, dependency])
    }
    if (variantType === 'undefined') {
      if (dependencies.size === 1) {
        const dep = variantToDepndency[0];
        return (result, reader, options) => {
          handle && handle(result, reader, options)
          return getCreateDeserializationHandle(dep[1], dep[2].offset, fromBuffer)(result, reader, options)
        }
      }
      else throw new BorshError(`Failed to find class to deserialize to from ${currClazz.name}: but no variants are used which makes deserialization undeterministic`)

    }

    return (result, reader, options) => {
      handle && handle(result, reader, options)
      let next = undefined;
      let nextOffset = undefined;

      if (variantType === 'number') {
        let agg = reader.u8();
        for (const dep of variantToDepndency) {
          if (agg === dep[0]) {
            return getCreateDeserializationHandle(dep[1], dep[2].offset, fromBuffer)(result, reader, options)
          }
        }
      }
      else if (variantType === 'string') {
        let variant = reader.string();
        for (const dep of variantToDepndency) {
          if (variant === dep[0]) {
            return getCreateDeserializationHandle(dep[1], dep[2].offset, fromBuffer)(result, reader, options)
          }
        }
      }
      else // array 
      {
        let agg: number[] = [];
        for (let i = 0; i < (variantType as number); i++) {
          agg.push(reader.u8())
        }
        for (const dep of variantToDepndency) {
          let currentVariant = dep[0];
          if (currentVariant.length === agg.length &&
            (currentVariant as number[]).every((value, index) => value === agg[index])) {

            return getCreateDeserializationHandle(dep[1], dep[2].offset, fromBuffer)(result, reader, options)
          }
        }
      }

      if (next == undefined && dependencies) {
        // do a recursive call and copy result, 
        // this is not computationally performant since we are going to traverse multiple path
        // and possible do deserialziation on bad paths
        if (dependencies.size == 1) // still deterministic
        {
          const n = dependencies.entries().next().value;
          next = n[0];
          nextOffset = n[1].offset;
        }
        else if (dependencies.size > 1) {
          const classes = [...dependencies.entries()].map(([c]) => c.name).join(', ')
          throw new BorshError(`Failed to find class to deserialize to from ${currClazz.name} found: ${classes} but no variant matches bytes read from the buffer.`)
        }
      }
      if (next != null) {
        getCreateDeserializationHandle(next, nextOffset, fromBuffer)(result, reader, options)

      }
      else {
        return endHandle(result, reader, options)
      }

    }

  }
  else {
    if (handle) {
      return (result, reader, options) => {
        handle(result, reader, options)
        return endHandle(result, reader, options)
      }
    }
    return endHandle
  }
}


const getOrCreateStructMeta = (clazz: any, offset: number): StructKind => {

  let schema: StructKind = getSchema(clazz, offset)
  if (!schema) {
    schema = new StructKind();
  }

  setSchema(clazz, schema, offset);
  return schema
}
const setDependencyToProtoType = (ctor: Function, offset: number) => {
  let proto = Object.getPrototypeOf(ctor);
  while (proto.prototype?.constructor != undefined) { // TODO break early if already done this!
    let newOffset = --offset;
    let dependencies = getDependencies(proto, newOffset);
    if (dependencies) {
      for (const dependency of dependencies) {
        if (ctor.prototype instanceof dependency || dependency === ctor) {
          return;
        }
      }
    }
    else {
      dependencies = []
    }
    dependencies.push(ctor);
    setDependencies(proto, newOffset, dependencies)
    proto = Object.getPrototypeOf(proto);
  }
}


const getSuperMostClass = (clazz: AbstractType<any>) => {
  while (Object.getPrototypeOf(clazz).prototype != undefined) {
    clazz = Object.getPrototypeOf(clazz);
  }
  return clazz;
}
/**
 * @param clazzA 
 * @param clazzB 
 * @returns true if A inherit B or B inherit A or A == B, else false
 */
const checkClazzesCompatible = (clazzA: Constructor<any> | AbstractType<any>, clazzB: Constructor<any> | AbstractType<any>) => {
  return clazzA == clazzB || clazzA.isPrototypeOf(clazzB) || clazzB.isPrototypeOf(clazzA)
}

export const getDependencies = (ctor: Function, offset: number): Function[] | undefined => ctor.prototype[PROTOTYPE_DEPENDENCY_HANDLER_OFFSET + offset]

const setDependencies = (ctor: Function, offset: number, dependencies: Function[]) => {
  ctor.prototype[PROTOTYPE_DEPENDENCY_HANDLER_OFFSET + offset] = dependencies // [getDependencyKey(ctor)] 
}

export const getAllDependencies = (ctor: Function, offset: number): Map<Function, { schema: StructKind, offset: number }> | undefined => {
  let existing = getDependencies(ctor, offset);
  if (existing) {
    let ret: Map<Function, { schema: StructKind, offset: number }> = new Map()
    for (const v of existing) {
      let schema = getSubMostSchema(v);
      if (schema.fields.length > 0 || schema.variant != undefined) { // non trivial
        ret.set(v, { schema, offset: getOffset(v) });
      }
      else { // check recursively
        let req = getAllDependencies(v, offset);
        for (const [rv, rk] of req) {
          ret.set(rv, rk);
        }
      }
    }
    return ret;
  }
}


const getDependenciesRecursively = (ctor: Function, offset: number, mem: Function[] = []): Function[] => {
  let dep = getDependencies(ctor, offset);
  if (dep) {
    for (const f of dep) {
      if (mem.includes(f)) {
        continue;
      }
      mem.push(f);
      getDependenciesRecursively(f, offset, mem);
    }
  }
  return mem
}


const setSchema = (ctor: Function, schemas: StructKind, offset: number) => {
  ctor.prototype[PROTOTYPE_SCHEMA_OFFSET + offset] = schemas;

}

export const getSchema = (ctor: Function, offset: number = getOffset(ctor)): StructKind => ctor.prototype[PROTOTYPE_SCHEMA_OFFSET + offset]

const getSubMostSchema = (ctor: Function): StructKind => {
  let last = undefined;
  for (var i = 0; i < MAX_PROTOTYPE_SEARCH; i++) {
    const curr = ctor.prototype[PROTOTYPE_SCHEMA_OFFSET + i];
    if (!curr && last && !getDependencies(ctor, i)?.length) {
      return last;
    }
    last = curr;
  }
  return;
}



export const getSchemasBottomUp = (ctor: Function): StructKind[] => {

  let last = undefined;
  let ret: StructKind[] = [];
  for (var i = 0; i < 1000; i++) {
    const curr = getSchema(ctor, i);
    if (!curr) {
      if (last && !getDependencies(ctor, i)?.length) {
        return ret;
      }
    }
    else {
      ret.push(curr);
      last = curr;
    }
  }
  return ret;
}

/**
 *
 * @param kind 'struct' or 'variant. 'variant' equivalnt to Rust Enum
 * @returns Schema decorator function for classes
 */
export const variant = (index: number | number[] | string) => {
  return (ctor: Function) => {
    let offset = getOffset(ctor);
    setDependencyToProtoType(ctor, offset);
    let schemas = getOrCreateStructMeta(ctor, offset);
    schemas.variant = index;

    // clear deserialization handles for all dependencies since we might have made a dynamic import which breakes the deserialization path caches
    for (const clazz of extendingClasses(ctor)) {
      clearDeserializeStructHandle(clazz, 0, true);
      clearDeserializeStructHandle(clazz, 0, false)
    }



    // Check for variant conficts 
    for (let i = offset - 1; i >= 0; i--) {
      const dependencies = getDependencies(ctor, i)
      if (dependencies) {
        for (const dependency of dependencies) {
          if (dependency !== ctor) {
            let otherVariant = getVariantIndex(getSchema(dependency, getOffset(dependency)))
            if (typeof otherVariant !== typeof index) {
              throw new BorshError(`Variant of ${ctor.name} have different type compared to its sibling: ${dependency.name}, expecting either number, number[] (with same sizes) or string, but not a combination of them`)
            }
            else if (index === otherVariant || (Array.isArray(index) && Array.isArray(otherVariant) && (index.length !== otherVariant.length || index.every((value, index) => value === (otherVariant as number[])[index])))) {
              throw new BorshError(`Variant of ${ctor.name}: ${JSON.stringify(index)} is the same as for ${dependency.name} which is not allowed (non-determinism)`)

            }
          }
          if (getVariantIndex(getSchema(dependency, getOffset(dependency))) != null) {
            return; // No need to validate more
          }
        }
      }
      if (getVariantIndex(getSchema(ctor, i)) != null) {
        return; // No need to validate more
      }
    }
  }


};

const getVariantIndex = (schema: StructKind): number | number[] | string | undefined => {
  return schema.variant
};

/**
 * @param properties, the properties of the field mapping to schema
 * @returns
 */
export function field(properties: SimpleField | CustomField<any>) {
  return (target: {} | any, name?: PropertyKey): any => {
    const offset = getOffset(target.constructor);
    setDependencyToProtoType(target.constructor, offset);
    const schemas = getOrCreateStructMeta(target.constructor, offset);
    const schema = schemas;
    const key = name.toString();

    let field: Field = undefined;
    if ((properties as SimpleField)["type"] != undefined) {
      field = {
        key,
        type: (properties as SimpleField)["type"],
      };
    } else {
      field = {
        key,
        type: properties as CustomField<any>,
      };
    }

    if (properties.index === undefined) {
      schema.fields.push(field); // add to the end. This will make property decorator execution order define field order
    } else {
      if (schema.fields[properties.index]) {
        throw new BorshError(
          "Multiple fields defined at the same index: " +
          properties.index +
          ", class: " +
          target.constructor.name
        );
      }
      if (properties.index >= schema.fields.length) {
        resize(schema.fields, properties.index + 1, undefined);
      }
      schema.fields[properties.index] = field;
    }
  };
}


/**
 * @experimental
 * @param properties, the properties of the field mapping to schema
 * @returns
 */
export function serializer() {
  return function (target: any, propertyKey: string) {
    const offset = getOffset(target.constructor);
    const schemas = getOrCreateStructMeta(target.constructor, offset);
    schemas.serializer = (obj, writer, serialize) => obj[propertyKey](writer, serialize)
  };
}




/**
 * @param clazzes
 * @param validate, run validation?
 * @returns Schema map
 */
export const validate = (clazzes: Constructor<any> | Constructor<any>[], allowUndefined = false) => {
  return validateIterator(clazzes, allowUndefined, new Set());
};

const validateIterator = (clazzes: AbstractType<any> | AbstractType<any>[], allowUndefined: boolean, visited: Set<string>) => {
  clazzes = Array.isArray(clazzes) ? clazzes : [clazzes];
  let schemas = new Map<any, StructKind>();
  clazzes.forEach((clazz, ix) => {
    clazz = getSuperMostClass(clazz);
    let dependencies = getDependenciesRecursively(clazz, getOffset(clazz));
    dependencies.push(clazz);
    dependencies.forEach((v, k) => {
      const schema = getSchema(v);
      if (!schema) {
        return;
      }
      schemas.set(v, schema);
      visited.add(v.name);


    });

    let lastVariant: number | number[] | string = undefined;
    let lastKey: Function = undefined;
    getAllDependencies(clazz, getOffset(clazz))?.forEach((dependency, key) => {
      if (!lastVariant)
        lastVariant = getVariantIndex(dependency.schema);
      else if (!validateVariantAreCompatible(lastVariant, getVariantIndex(dependency.schema))) {
        throw new BorshError(`Class ${key.name} is extended by classes with variants of different types. Expecting only one of number, number[] or string`)
      }

      if (lastKey != undefined && lastVariant == undefined) {
        throw new BorshError(`Classes inherit ${clazz} and are introducing new field without introducing variants. This leads to unoptimized deserialization`)
      }
      lastKey = key;
    })

    schemas.forEach((structSchema, clazz) => {
      structSchema.fields.forEach((field) => {
        if (!field) {
          throw new BorshError(
            "Field is missing definition, most likely due to field indexing with missing indices"
          );
        }
        if (allowUndefined) {
          return;
        }
        if (field.type instanceof Function) {
          // Treat Uint8Array as a known built-in type
          if (field.type === Uint8Array) {
            return;
          }
          if (!getSchema(field.type) && !getAllDependencies(field.type, getOffset(clazz))?.size) {
            throw new BorshError("Unknown field type: " + field.type.name);
          }

          // Validate field
          validateIterator(field.type, allowUndefined, visited);
        }
      });
    })
  });


}


const resize = (arr: Array<any>, newSize: number, defaultValue: any) => {
  while (newSize > arr.length) arr.push(defaultValue);
  arr.length = newSize;
};

const validateVariantAreCompatible = (a: number | number[] | string, b: number | number[] | string) => {
  if (typeof a != typeof b) {
    return false;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length != b.length) {
      return false;
    }
  }
  return true;
}

export const getDiscriminator = (constructor: Constructor<any>): Uint8Array => {
  const schemas = getSchemasBottomUp(constructor);
  const writer = new BinaryWriter();
  for (let i = 0; i < schemas.length; i++) {
    const clazz = schemas[i];
    if (i !== schemas.length - 1 && clazz.fields.length > 0) {
      throw new BorshError("Discriminator can not be resolved for inheritance where super class contains fields, undefined behaviour")
    }
    const variant = clazz.variant;
    if (variant == undefined) {
      continue;
    }
    if (typeof variant === 'string') {
      writer.string(variant)
    }
    else if (typeof variant === 'number') {
      writer.u8(variant)
    }
    else if (Array.isArray(variant)) {
      variant.forEach((v) => {
        writer.u8(v)
      })
    }
    else {
      throw new BorshError("Can not resolve discriminator for variant with type: " + (typeof variant))
    }

  }

  return writer.finalize();
}