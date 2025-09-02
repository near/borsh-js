import { BinaryReader, BinaryWriter } from "../binary.js";
import {
  deserialize,
  serialize,
  validate,
  field,
  variant,
  StructKind,
  vec,
  option,
  fixedArray,
  getDiscriminator,
  getSchema,
  BorshError,
  string,
  serializer,
} from "../index.js";
import crypto from "crypto";

describe("struct", () => {
  test("constructor is not called", () => {
    let constructorInvokation = 0;
    class TestStruct {
      @field({ type: "u8" })
      a: number;
      constructor(a: number) {
        this.a = a;
        constructorInvokation += 1;
      }
    }
    const a = new TestStruct(123);
    expect(constructorInvokation).toEqual(1);
    deserialize(serialize(a), TestStruct);
    expect(constructorInvokation).toEqual(1);
  });

  test("constructor is not called if optioned", () => {
    let constructorInvokation = 0;
    class TestStruct {
      @field({ type: "u8" })
      a: number;
      constructor(a: number) {
        this.a = a;
        constructorInvokation += 1;
      }
    }

    const a = new TestStruct(123);
    expect(constructorInvokation).toEqual(1);
    deserialize(serialize(a), TestStruct, { construct: true });
    expect(constructorInvokation).toEqual(2);
  });

  test("as object", () => {
    let constructorInvokation = 0;
    class TestStruct {
      @field({ type: "u8" })
      a: number;
      constructor(a: number) {
        this.a = a;
        constructorInvokation += 1;
      }
    }

    const a = new TestStruct(123);
    expect(constructorInvokation).toEqual(1);
    const object = deserialize(serialize(a), TestStruct, { object: true });
    expect(object instanceof TestStruct).toBeFalsy();
    expect(object.a).toEqual(123);
    expect(constructorInvokation).toEqual(1);
  });

  test("multifield", () => {
    class TestStruct {
      @field({ type: "u8" })
      public a: number;

      @field({ type: "u64" })
      public b: bigint;

      constructor(properties?: { a: number; b: bigint }) {
        if (properties) {
          this.a = properties.a;
          this.b = properties.b;
        }
      }
    }
    validate(TestStruct);
    const expectedResult: StructKind = new StructKind({
      fields: [
        {
          key: "a",
          type: "u8",
        },
        {
          key: "b",
          type: "u64",
        },
      ],
    });
    expect(getSchema(TestStruct)).toEqual(expectedResult);
    const bn123 = BigInt(123);
    const instance = new TestStruct({ a: 1, b: bn123 });
    const buf = serialize(instance);
    expect(new Uint8Array(buf)).toEqual(
      new Uint8Array([1, 123, 0, 0, 0, 0, 0, 0, 0])
    );
    const deserialized = deserialize(buf, TestStruct);
    expect(deserialized.a).toEqual(1);
    expect(deserialized.b).toEqual(BigInt(123));
    const bufAgain = serialize(deserialized);
    expect(new Uint8Array(bufAgain)).toEqual(
      new Uint8Array([1, 123, 0, 0, 0, 0, 0, 0, 0])
    );
  });

  test("struct fields", () => {
    class InnerStruct {
      @field({ type: "u8" })
      public b: number;

      constructor(b: number) {
        this.b = b;
      }
    }

    class TestStruct {
      @field({ type: InnerStruct })
      public a: InnerStruct;

      constructor(a: InnerStruct) {
        this.a = a;
      }
    }

    validate(TestStruct);
    expect(getSchema(TestStruct)).toEqual(
      new StructKind({
        fields: [{ key: "a", type: InnerStruct }],
      })
    );

    expect(getSchema(InnerStruct)).toEqual(
      new StructKind({
        fields: [{ key: "b", type: "u8" }],
      })
    );

    const buf = serialize(new TestStruct(new InnerStruct(123)));
    expect(deserialize(buf, TestStruct).a.b).toEqual(123);
  });

  test("gaps", () => {
    class TestStruct {
      @field({ type: "u8" })
      public a: number;

      public b: number;

      @field({ type: "u8" })
      public c: number;
    }

    validate(TestStruct);
    let schema = getSchema(TestStruct);
    expect(schema.fields.length).toEqual(2);
    expect(schema.fields[0].key).toEqual("a");
    expect(schema.fields[1].key).toEqual("c");
  });
});

describe("bool", () => {
  test("serialize/deserialize", () => {
    class TestStruct {
      @field({ type: "bool" })
      public a: boolean;

      @field({ type: "bool" })
      public b: boolean;

      constructor(properties?: { a: boolean; b: boolean }) {
        if (properties) {
          this.a = properties.a;
          this.b = properties.b;
        }
      }
    }
    validate(TestStruct);
    const expectedResult: StructKind = new StructKind({
      fields: [
        {
          key: "a",
          type: "bool",
        },
        {
          key: "b",
          type: "bool",
        },
      ],
    });

    expect(getSchema(TestStruct)).toEqual(expectedResult);
    const instance = new TestStruct({ a: true, b: false });
    const buf = serialize(instance);
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([1, 0]));
    const deserialized = deserialize(buf, TestStruct);
    expect(deserialized.a).toEqual(true);
    expect(deserialized.b).toEqual(false);
    const bufAgain = serialize(deserialized);
    expect(new Uint8Array(bufAgain)).toEqual(new Uint8Array([1, 0]));
  });
});

describe("arrays", () => {
  test("fixed array simple", () => {
    class TestStruct {
      @field({ type: fixedArray("u32", 3) })
      public a: number[];

      constructor(properties?: { a: number[] }) {
        if (properties) {
          this.a = properties.a;
        }
      }
    }

    validate(TestStruct);
    const buf = serialize(new TestStruct({ a: [1, 2, 3] }));
    expect(new Uint8Array(buf)).toEqual(
      new Uint8Array([1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0])
    );
    const deserialized = deserialize(buf, TestStruct);
    expect(deserialized.a).toEqual([1, 2, 3]);
  });

  test("fixed array u8", () => {
    class TestStruct {
      @field({ type: fixedArray("u8", 3) })
      public a: number[];

      constructor(properties?: { a: number[] }) {
        if (properties) {
          this.a = properties.a;
        }
      }
    }

    validate(TestStruct);
    const buf = serialize(new TestStruct({ a: [1, 2, 3] }));
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([1, 2, 3]));
    const deserialized = deserialize(buf, TestStruct);
    expect(deserialized.a instanceof Uint8Array).toBeTruthy();
    expect(new Uint8Array(deserialized.a)).toEqual(new Uint8Array([1, 2, 3]));
  });

  test("byte array should deserialize zero-copy from Uint8array", () => {
    class TestStruct {
      @field({ type: fixedArray("u8", 3) })
      public a: Uint8Array | number[];

      constructor(properties?: { a: number[] }) {
        if (properties) {
          this.a = properties.a;
        }
      }
    }

    validate(TestStruct);
    const buf = new Uint8Array(serialize(new TestStruct({ a: [1, 2, 3] })));
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([1, 2, 3]));
    const deserialized = deserialize(buf, TestStruct);
    deserialized.a[0] = 123;
    expect(buf[0]).toEqual(123);
  });

  test("byte array should deserialize zero-copy from Buffer", () => {
    class TestStruct {
      @field({ type: fixedArray("u8", 3) })
      public a: Uint8Array | number[];

      constructor(properties?: { a: number[] }) {
        if (properties) {
          this.a = properties.a;
        }
      }
    }

    validate(TestStruct);
    const buf = serialize(new TestStruct({ a: [1, 2, 3] }));
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([1, 2, 3]));
    const deserialized = deserialize(buf, TestStruct);
    deserialized.a[0] = 123;
    expect(buf[0]).toEqual(123);
  });

  test("fixed array wrong length serialize", () => {
    class TestStruct {
      @field({ type: fixedArray("u8", 3) })
      public a: number[];

      constructor(properties?: { a: number[] }) {
        if (properties) {
          this.a = properties.a;
        }
      }
    }

    validate(TestStruct);
    expect(() => serialize(new TestStruct({ a: [1, 2] }))).toThrowError();
  });

  test("fixed array wrong length deserialize", () => {
    class TestStruct {
      @field({ type: fixedArray("u8", 3) })
      public a: number[];

      constructor(properties?: { a: number[] }) {
        if (properties) {
          this.a = properties.a;
        }
      }
    }
    validate(TestStruct);
    expect(() =>
      deserialize(new Uint8Array([1, 2]), TestStruct)
    ).toThrowError();
  });
  test("u8intarray", () => {
    class TestStruct {
      @field({ type: Uint8Array })
      public a: Uint8Array;

      constructor(properties?: { a: Uint8Array }) {
        if (properties) {
          this.a = properties.a;
        }
      }
    }

    validate(TestStruct);
    const buf = serialize(new TestStruct({ a: new Uint8Array([1, 2, 3]) }));
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([3, 0, 0, 0, 1, 2, 3]));
    const deserialized = deserialize(buf, TestStruct);
    expect(new Uint8Array(deserialized.a)).toEqual(new Uint8Array([1, 2, 3]));
  });
  describe("vec", () => {
    test("simple", () => {
      class TestStruct {
        @field({ type: vec("u8") })
        public a: number[];

        constructor(properties?: { a: number[] }) {
          if (properties) {
            this.a = properties.a;
          }
        }
      }

      validate(TestStruct);
      const buf = serialize(new TestStruct({ a: [1, 2, 3] }));
      expect(new Uint8Array(buf)).toEqual(
        new Uint8Array([3, 0, 0, 0, 1, 2, 3])
      );
      const deserialized = deserialize(buf, TestStruct);
      expect(new Uint8Array(deserialized.a)).toEqual(new Uint8Array([1, 2, 3]));
    });
    test("struct", () => {
      class Element {
        @field({ type: "u8" })
        public a: number;

        constructor(properties?: { a: number }) {
          if (properties) {
            this.a = properties.a;
          }
        }
      }

      class TestStruct {
        @field({ type: vec(Element) })
        public a: Element[];

        constructor(properties?: { a: Element[] }) {
          if (properties) {
            this.a = properties.a;
          }
        }
      }

      validate(TestStruct);
      const arr = [
        new Element({ a: 1 }),
        new Element({ a: 2 }),
        new Element({ a: 3 }),
      ];
      const buf = serialize(new TestStruct({ a: arr }));
      expect(new Uint8Array(buf)).toEqual(
        new Uint8Array([3, 0, 0, 0, 1, 2, 3])
      );
      const deserialized = deserialize(buf, TestStruct);
      expect(deserialized.a).toEqual(arr);
    });

    test("override size type", () => {
      class TestStruct {
        @field({ type: vec("u16", "u8") })
        public a: number[];

        constructor(properties?: { a: number[] }) {
          if (properties) {
            this.a = properties.a;
          }
        }
      }

      validate(TestStruct);
      const buf = serialize(new TestStruct({ a: [1, 2, 3] }));
      expect(new Uint8Array(buf)).toEqual(
        new Uint8Array([3, 1, 0, 2, 0, 3, 0])
      );
      const deserialized = deserialize(buf, TestStruct);
      expect(deserialized.a).toEqual([1, 2, 3]);
    });

    test("will not allocate unless there is data to deserialize", () => {
      class Inner {
        @field({ type: "u8" })
        number: number;
      }

      class TestStruct {
        @field({ type: vec(Inner) })
        public a: Inner[];
      }

      expect(() =>
        deserialize(new Uint8Array([255, 255, 255, 255]), TestStruct)
      ).toThrowError();
    });

    test("can deserialize large arrays", () => {
      class TestStruct {
        @field({ type: vec("string") })
        public a: string[];
      }
      const size = 1024 * 1024 + 100;
      const struct = new TestStruct();
      struct.a = new Array(size).fill("a");
      const deserialized = deserialize(serialize(struct), TestStruct);
      expect(deserialized.a).toHaveLength(size);
      for (const a of struct.a) {
        // we do this instead of expect(...).toEqual() because this is faster
        if (a !== "a") {
          throw new Error("Unexpected");
        }
      }
    });
  });
});

describe("number", () => {
  test("u8", () => {
    class Struct {
      @field({ type: "u8" })
      public a: number;

      constructor(a: number) {
        this.a = a;
      }
    }
    const instance = new Struct(3);
    const buf = serialize(instance);
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([3]));
    const deserialized = deserialize(buf, Struct);
    expect(deserialized.a).toEqual(3);
  });

  test("u8 max", () => {
    class Struct {
      @field({ type: "u8" })
      public a: number;

      constructor(a: number) {
        this.a = a;
      }
    }
    const instance = new Struct(255);
    const buf = serialize(instance);
    const deserialized = deserialize(buf, Struct);
    expect(deserialized.a).toEqual(255);
  });

  test("u16", () => {
    class Struct {
      @field({ type: "u16" })
      public a: number;

      constructor(a: number) {
        this.a = a;
      }
    }
    const instance = new Struct(300);
    const buf = serialize(instance);
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([44, 1]));
    const deserialized = deserialize(buf, Struct);
    expect(deserialized.a).toEqual(300);
  });

  test("u32", () => {
    class Struct {
      @field({ type: "u32" })
      public a: number;

      constructor(a: number) {
        this.a = a;
      }
    }
    const instance = new Struct(4294967295);
    const buf = serialize(instance);
    const deserialized = deserialize(buf, Struct);
    expect(deserialized.a).toEqual(4294967295);
  });

  describe("u64", () => {
    class Struct {
      @field({ type: "u64" })
      public a: bigint | number;

      constructor(a: number | bigint) {
        this.a = a;
      }
    }
    test("u64 is le", () => {
      const instance = new Struct(BigInt(1000));
      const buf = serialize(instance);
      expect(new Uint8Array(buf)).toEqual(
        new Uint8Array([232, 3, ...new Array(6).fill(0)])
      );
      const deserialized = deserialize(buf, Struct);
      expect(deserialized.a).toEqual(BigInt(1000));
    });

    test("u64 with number", () => {
      let date = +new Date();
      const instance = new Struct(date);
      const buf = serialize(instance);
      const deserialized = deserialize(buf, Struct);
      expect(deserialized.a).toEqual(BigInt(date));
    });
    test("u64 large", () => {
      const n = 18446744073709515n;
      const instance = new Struct(n);
      const buf = serialize(instance);
      const deserialized = deserialize(buf, Struct);
      expect(deserialized.a).toEqual(n);
    });
    test("u64 max", () => {
      const n = 18446744073709551615n;
      const instance = new Struct(n);
      const buf = serialize(instance);
      const deserialized = deserialize(buf, Struct);
      expect(deserialized.a).toEqual(n);
    });
  });
  test("u128 max", () => {
    class Struct {
      @field({ type: "u128" })
      public a: bigint;

      constructor(a: bigint) {
        this.a = a;
      }
    }
    const n = 340282366920938463463374607431768211455n;
    const instance = new Struct(n);
    const buf = serialize(instance);
    const deserialized = deserialize(buf, Struct);
    expect(deserialized.a).toEqual(n);
  });
  test("u128 is le", () => {
    class Struct {
      @field({ type: "u128" })
      public a: bigint;

      constructor(a: bigint) {
        this.a = a;
      }
    }
    const n = BigInt(15);
    const instance = new Struct(n);
    const buf = serialize(instance);
    expect(new Uint8Array(buf)).toEqual(
      new Uint8Array([15, ...new Array(15).fill(0)])
    );
    const deserialized = deserialize(buf, Struct);
    expect(deserialized.a).toEqual(BigInt(15));
  });

  test("u256 max", () => {
    class Struct {
      @field({ type: "u256" })
      public a: bigint;

      constructor(a: bigint) {
        this.a = a;
      }
    }
    const n = BigInt(1.15e77);
    const instance = new Struct(n);
    const buf = serialize(instance);
    const deserialized = deserialize(buf, Struct);
    expect(deserialized.a).toEqual(n);
  });

  test("u256 is le", () => {
    class Struct {
      @field({ type: "u256" })
      public a: bigint;

      constructor(a: bigint) {
        this.a = a;
      }
    }
    const n = BigInt(123);
    const instance = new Struct(n);
    const buf = serialize(instance);
    const serializedExpected = new Uint8Array([123, ...new Array(31).fill(0)]);

    expect(new Uint8Array(buf)).toEqual(serializedExpected);
    const deserialized = deserialize(buf, Struct);
    expect(deserialized.a).toEqual(n);

    // check that the original array has not been modified
    expect(new Uint8Array(buf)).toEqual(serializedExpected);
  });

  test("u256 with Uin8array", () => {
    class Struct {
      @field({ type: "u256" })
      public a: bigint;

      constructor(a: bigint) {
        this.a = a;
      }
    }
    const n = BigInt(123);
    const instance = new Struct(n);
    const buf = new Uint8Array(serialize(instance));

    const serializedExpected = new Uint8Array([123, ...new Array(31).fill(0)]);

    expect(new Uint8Array(buf)).toEqual(serializedExpected);
    const deserialized = deserialize(buf, Struct);
    expect(deserialized.a).toEqual(n);

    // check that the original array has not been modified
    expect(new Uint8Array(buf)).toEqual(serializedExpected);
  });

  test("u512 is le", () => {
    class Struct {
      @field({ type: "u512" })
      public a: bigint;

      constructor(a: bigint) {
        this.a = a;
      }
    }
    const instance = new Struct(BigInt(3));
    const buf = serialize(instance);
    const serializedExpected = new Uint8Array([3, ...new Array(63).fill(0)]);
    expect(new Uint8Array(buf)).toEqual(serializedExpected);
    const deserialized = deserialize(buf, Struct);
    expect(deserialized.a).toEqual(BigInt(3));

    // check that the original array has not been modified
    expect(new Uint8Array(buf)).toEqual(serializedExpected);
  });

  test("u512 with Uint8array", () => {
    class Struct {
      @field({ type: "u512" })
      public a: bigint;

      constructor(a: bigint) {
        this.a = a;
      }
    }
    const instance = new Struct(BigInt(3));
    const buf = new Uint8Array(serialize(instance));
    const serializedExpected = new Uint8Array([3, ...new Array(63).fill(0)]);
    expect(new Uint8Array(buf)).toEqual(serializedExpected);
    const deserialized = deserialize(buf, Struct);
    expect(deserialized.a).toEqual(BigInt(3));

    // check that the original array has not been modified
    expect(new Uint8Array(buf)).toEqual(serializedExpected);
  });

  test("u512 max", () => {
    class Struct {
      @field({ type: "u512" })
      public a: bigint;

      constructor(a: bigint) {
        this.a = a;
      }
    }
    const n = BigInt(1.34e154);
    const instance = new Struct(n);
    const buf = serialize(instance);
    const deserialized = deserialize(buf, Struct);
    expect(deserialized.a).toEqual(n);
  });
  describe("f32", () => {
    class Struct {
      @field({ type: "f32" })
      public a: number;

      constructor(a: number) {
        this.a = a;
      }
    }
    test("f32 decimal", () => {
      const instance = new Struct(3.123);
      const buf = serialize(instance);
      expect(new Uint8Array(buf)).toEqual(new Uint8Array([59, 223, 71, 64]));

      const deserialized = deserialize(buf, Struct);
      expect(deserialized.a).toEqual(3.122999906539917);
    });

    test("f32 min", () => {
      const instance = new Struct(-3.40282347e38);
      const buf = serialize(instance);
      const deserialized = deserialize(buf, Struct);
      expect(deserialized.a).toEqual(-3.4028234663852886e38);
    });
    test("f32 max", () => {
      const instance = new Struct(3.40282347e38);
      const buf = serialize(instance);
      const deserialized = deserialize(buf, Struct);
      expect(deserialized.a).toEqual(3.4028234663852886e38);
    });

    test("f32 nan ser", () => {
      expect(() => serialize(new Struct(Number.NaN))).toThrowError(BorshError);
    });

    test("f32 nan der", () => {
      expect(() =>
        deserialize(new Uint8Array([0, 0, 192, 127]), Struct)
      ).toThrowError(BorshError);
    });
  });

  describe("f64", () => {
    class Struct {
      @field({ type: "f64" })
      public a: number;

      constructor(a: number) {
        this.a = a;
      }
    }
    test("f64 decimal", () => {
      const instance = new Struct(3.123);
      const buf = serialize(instance);
      expect(new Uint8Array(buf)).toEqual(
        new Uint8Array([150, 67, 139, 108, 231, 251, 8, 64])
      );

      const deserialized = deserialize(buf, Struct);
      expect(deserialized.a).toEqual(3.123);
    });

    test("f64 min", () => {
      const instance = new Struct(-1.7976931348623157e308);
      const buf = serialize(instance);
      const deserialized = deserialize(buf, Struct);
      expect(deserialized.a).toEqual(-1.7976931348623157e308);
    });
    test("f64 max", () => {
      const instance = new Struct(1.7976931348623157e308);
      const buf = serialize(instance);
      const deserialized = deserialize(buf, Struct);
      expect(deserialized.a).toEqual(1.7976931348623157e308);
    });

    test("f64 nan ser", () => {
      expect(() => serialize(new Struct(Number.NaN))).toThrowError(BorshError);
    });

    test("f64 nan der", () => {
      expect(() =>
        deserialize(new Uint8Array([0, 0, 192, 127]), Struct)
      ).toThrowError(BorshError);
    });
  });
});
describe("enum", () => {
  test("enum base", () => {
    @variant(1)
    class TestEnum {
      @field({ type: "u8" })
      public a: number;

      constructor(a: number) {
        this.a = a;
      }
    }
    const instance = new TestEnum(3);
    validate(TestEnum);
    const buf = serialize(instance);
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([1, 3]));
    const deserialized = deserialize(buf, TestEnum);
    expect(deserialized.a).toEqual(3);
  });

  test("empty", () => {
    @variant(1)
    class TestEnum {}
    const instance = new TestEnum();
    validate(TestEnum);
    const buf = serialize(instance);
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([1]));
  });

  test("variant dependency is treaded as struct", () => {
    @variant(0)
    class ImplementationByVariant {
      public someField: number;
      constructor(someField?: number) {
        this.someField = someField;
      }
    }

    class TestStruct {
      @field({ type: ImplementationByVariant })
      public variant: ImplementationByVariant;

      constructor(variant?: ImplementationByVariant) {
        this.variant = variant;
      }
    }
    validate(TestStruct);
    expect(getSchema(TestStruct)).toBeDefined();
    expect(getSchema(ImplementationByVariant)).toBeDefined();
  });

  test("enum field serialization/deserialization", () => {
    class Super {}

    @variant(0)
    class Enum0 extends Super {
      @field({ type: "u8" })
      public a: number;

      constructor(a: number) {
        super();
        this.a = a;
      }
    }

    @variant(1)
    class Enum1 extends Super {
      @field({ type: "u8" })
      public b: number;

      constructor(b: number) {
        super();
        this.b = b;
      }
    }

    class TestStruct {
      @field({ type: Super })
      public enum: Super;

      constructor(value: Super) {
        this.enum = value;
      }
    }
    const instance = new TestStruct(new Enum1(4));
    validate(Super);
    expect(getSchema(Enum0)).toBeDefined();
    expect(getSchema(Enum1)).toBeDefined();
    expect(getSchema(TestStruct)).toBeDefined();

    const serialized = serialize(instance);

    expect(new Uint8Array(serialized)).toEqual(new Uint8Array([1, 4]));

    const deserialied = deserialize(new Uint8Array(serialized), TestStruct);
    expect(deserialied.enum).toBeInstanceOf(Enum1);
    expect((deserialied.enum as Enum1).b).toEqual(4);
  });

  test("extended enum top variants", () => {
    class SuperSuper {}

    class Super extends SuperSuper {
      constructor() {
        super();
      }
    }

    @variant(0)
    class Enum0 extends Super {
      @field({ type: "u8" })
      public a: number;

      constructor(a: number) {
        super();
        this.a = a;
      }
    }

    @variant(1)
    class Enum1 extends Super {
      @field({ type: "u8" })
      public b: number;

      constructor(b: number) {
        super();
        this.b = b;
      }
    }

    @variant(66)
    class EnumX extends SuperSuper {
      @field({ type: "u8" })
      public c: number;

      constructor(c: number) {
        super();
        this.c = c;
      }
    }

    const instance = new Enum1(4);
    //  validate([Enum0, Enum1, Super, SuperSuper]);
    expect(getSchema(Enum0)).toBeDefined();
    expect(getSchema(Enum1)).toBeDefined();
    const serialized = serialize(instance);
    expect(new Uint8Array(serialized)).toEqual(new Uint8Array([1, 4]));

    const deserialied = deserialize(new Uint8Array(serialized), SuperSuper);
    expect(deserialied).toBeInstanceOf(Enum1);
    expect((deserialied as Enum1).b).toEqual(4);
  });

  test("extended enum inheritance variants", () => {
    @variant(1)
    class SuperSuper {}

    @variant(2)
    class Super extends SuperSuper {
      constructor() {
        super();
      }
    }

    @variant([3, 100])
    class Enum0 extends Super {
      @field({ type: "u8" })
      public a: number;

      constructor(a: number) {
        super();
        this.a = a;
      }
    }

    @variant([3, 4])
    class Enum1 extends Super {
      @field({ type: "u8" })
      public b: number;

      constructor(b: number) {
        super();
        this.b = b;
      }
    }

    const instance = new Enum1(5);
    //  validate([Enum0, Enum1, Super, SuperSuper]);
    expect(getSchema(Enum0)).toBeDefined();
    expect(getSchema(Enum1)).toBeDefined();
    const serialized = serialize(instance);
    expect(new Uint8Array(serialized)).toEqual(new Uint8Array([1, 2, 3, 4, 5]));

    const deserialied = deserialize(new Uint8Array(serialized), SuperSuper);
    expect(deserialied).toBeInstanceOf(Enum1);
    expect((deserialied as Enum1).b).toEqual(5);
  });

  test("extended enum super fields", () => {
    class SuperSuper {
      @field({ type: "u32" })
      x: number;

      constructor(x: number) {
        this.x = x;
      }
    }

    @variant(2)
    class Super extends SuperSuper {
      constructor(x: number) {
        super(x);
      }
    }

    @variant([3, 100])
    class Enum0 extends Super {
      @field({ type: "u8" })
      public a: number;

      constructor(a: number, x: number) {
        super(x);
        this.a = a;
      }
    }

    @variant([3, 4])
    class Enum1 extends Super {
      @field({ type: "u8" })
      public b: number;

      constructor(b: number, x: number) {
        super(x);
        this.b = b;
      }
    }

    const instance = new Enum1(5, 123);
    //  validate([Enum0, Enum1, Super, SuperSuper]);
    expect(getSchema(Enum0)).toBeDefined();
    expect(getSchema(Enum1)).toBeDefined();
    const serialized = serialize(instance);
    expect(new Uint8Array(serialized)).toEqual(
      new Uint8Array([123, 0, 0, 0, 2, 3, 4, 5])
    );

    const deserialied = deserialize(new Uint8Array(serialized), SuperSuper);
    expect(deserialied).toBeInstanceOf(Enum1);
    expect((deserialied as Enum1).b).toEqual(5);
  });

  test("extended enum inheritance variants, deserialization target does not matter", () => {
    @variant(1)
    class Super {}

    @variant(2)
    class Clazz extends Super {
      constructor() {
        super();
      }
    }

    deserialize(new Uint8Array(serialize(new Clazz())), Clazz);

    deserialize(new Uint8Array(serialize(new Clazz())), Super);
  });

  test("extended enum inheritance variants, serialization target does matter for fields", () => {
    @variant(0)
    class Super {}

    @variant(0)
    class ClazzA extends Super {
      constructor() {
        super();
      }
    }
    @variant(1)
    class ClazzB extends Super {
      constructor() {
        super();
      }
    }

    class Struct {
      @field({ type: ClazzA })
      property: ClazzA;
      constructor() {}
    }

    const s = new Struct();
    s.property = new ClazzB();

    expect(() => serialize(s)).toThrowError();
  });

  test("extended enum inheritance variants, deserialization target does matter for fields", () => {
    @variant(0)
    class Super {}

    @variant(0)
    class ClazzA extends Super {
      constructor() {
        super();
      }
    }
    @variant(1)
    class ClazzB extends Super {
      constructor() {
        super();
      }
    }

    class Struct {
      @field({ type: ClazzB })
      property: ClazzB;
      constructor() {}
    }
    // we try to deserializ [0,0] into Struct, which shouldnot be possible since property is instance of ClazzB
    expect(() =>
      deserialize(new Uint8Array(Uint8Array.from([0, 0])), Struct)
    ).toThrowError();
  });

  test("extended enum inheritance and field value conflict is resolved", () => {
    @variant(1)
    class Super {}

    @variant(2)
    class Clazz extends Super {
      @field({ type: option(Super) })
      field: Super;
      constructor() {
        super();
      }
    }

    deserialize(new Uint8Array(serialize(new Clazz())), Clazz);

    deserialize(new Uint8Array(serialize(new Clazz())), Super);
  });
  test("abstract class as super class", () => {
    abstract class A {
      @field({ type: "u8" })
      public number: number;
      constructor(number: number) {
        this.number = number;
      }
    }
    class AA extends A {}
    abstract class B {
      @field({ type: A })
      public a: A;
      constructor(a: A) {
        this.a = a;
      }
    }
    class BB extends B {}
    const b = new BB(new AA(123));

    expect(deserialize(serialize(b), B).a.number).toEqual(123);
  });

  test("inheritance without variant", () => {
    class Super {}
    class A extends Super {
      @field({ type: "u8" })
      public a: number;
    }
    class B extends A {
      @field({ type: "u8" })
      public b: number;

      constructor(opts?: { a: number; b: number }) {
        super();
        if (opts) {
          Object.assign(this, opts);
        }
      }
    }
    @variant(0)
    class C1 extends B {
      constructor(opts?: { a: number; b: number }) {
        super();
        if (opts) {
          Object.assign(this, opts);
        }
      }
    }
    @variant(1)
    class C2 extends B {}

    validate(Super);

    const serialized = serialize(new C1({ a: 1, b: 2 }));
    expect(new Uint8Array(serialized)).toEqual(new Uint8Array([1, 2, 0]));

    const deserialied = deserialize(serialized, Super);
    expect(deserialied).toBeInstanceOf(C1);
    expect((deserialied as C1).a).toEqual(1);
    expect((deserialied as C1).b).toEqual(2);
  });

  test("wrapped enum", () => {
    class Super {}

    @variant(2)
    class Enum2 extends Super {
      @field({ type: "u8" })
      public a: number;

      constructor(a: number) {
        super();
        this.a = a;
      }
    }

    class TestStruct {
      @field({ type: option(Super) })
      public enum: Super | undefined;

      constructor(value: Super | undefined) {
        this.enum = value;
      }
    }
    const instance = new TestStruct(new Enum2(3));
    validate(Super);
    expect(getSchema(Enum2)).toBeDefined();
    expect(getSchema(TestStruct)).toBeDefined();
    const serialized = serialize(instance);
    expect(new Uint8Array(serialized)).toEqual(new Uint8Array([1, 2, 3])); // 1 for option, 2 for variant, 3 for value
    const deserialied = deserialize(new Uint8Array(serialized), TestStruct);
    expect(deserialied.enum).toBeInstanceOf(Enum2);
    expect((deserialied.enum as Enum2).a).toEqual(3);
  });

  test("enum variant array", () => {
    class Super {}

    @variant([1, 2, 3])
    class Enum0 extends Super {
      @field({ type: "u8" })
      public a: number;

      constructor(a: number) {
        super();
        this.a = a;
      }
    }

    @variant([1, 2, 4])
    class Enum1 extends Super {
      @field({ type: "u8" })
      public a: number;

      constructor(a: number) {
        super();
        this.a = a;
      }
    }

    class TestStruct {
      @field({ type: Super })
      public enum: Super;

      constructor(value: Super) {
        this.enum = value;
      }
    }
    const instance = new TestStruct(new Enum1(5));
    validate(Super);
    expect(getSchema(Enum1)).toBeDefined();
    expect(getSchema(TestStruct)).toBeDefined();
    const serialized = serialize(instance);
    expect(new Uint8Array(serialized)).toEqual(new Uint8Array([1, 2, 4, 5]));
    const deserialied = deserialize(new Uint8Array(serialized), TestStruct);
    expect(deserialied.enum).toBeInstanceOf(Enum1);
    expect((deserialied.enum as Enum0).a).toEqual(5);
  });

  test("enum string variant", () => {
    class Ape {
      @field({ type: "string" })
      name: string;

      constructor(name?: string) {
        this.name = name;
      }
    }

    @variant("🦍")
    class Gorilla extends Ape {}

    @variant("🦧")
    class Orangutan extends Ape {}

    class HighCouncil {
      @field({ type: vec(Ape) })
      members: Ape[];
      constructor(members?: Ape[]) {
        if (members) {
          this.members = members;
        }
      }
    }
    let bytes = serialize(
      new HighCouncil([new Gorilla("Go"), new Orangutan("Ora")])
    );
    let deserialized = deserialize(new Uint8Array(bytes), HighCouncil);
    expect(deserialized).toBeInstanceOf(HighCouncil);
    expect(deserialized.members[0]).toBeInstanceOf(Gorilla);
    expect(deserialized.members[0].name).toEqual("Go");
    expect(deserialized.members[1]).toBeInstanceOf(Orangutan);
    expect(deserialized.members[1].name).toEqual("Ora");
  });

  test("dynamic import", async () => {
    await import("./fixtures/enums/b.js");
    await import("./fixtures/enums/a.js");
  });
});

describe("option", () => {
  test("field option", () => {
    class TestStruct {
      @field({ type: option("u8") })
      public a?: number;
      constructor(a: number) {
        this.a = a;
      }
    }
    validate(TestStruct);
    const expectedResult: StructKind = new StructKind({
      fields: [
        {
          key: "a",
          type: option("u8"),
        },
      ],
    });
    expect(getSchema(TestStruct)).toEqual(expectedResult);
    const bufSome = serialize(new TestStruct(123));
    expect(new Uint8Array(bufSome)).toEqual(new Uint8Array([1, 123]));
    const deserializedSome = deserialize(new Uint8Array(bufSome), TestStruct);
    expect(deserializedSome.a).toEqual(123);

    const bufNone = serialize(new TestStruct(undefined));
    expect(new Uint8Array(bufNone)).toEqual(new Uint8Array([0]));
    const deserialized = deserialize(new Uint8Array(bufNone), TestStruct);
    expect(deserialized.a).toBeUndefined();
  });

  test("field option struct", () => {
    class Element {
      @field({ type: "u8" })
      public a: number | undefined;
      constructor(a: number | undefined) {
        this.a = a;
      }
    }
    class TestStruct {
      @field({ type: option(Element) })
      public a: Element | undefined;
      constructor(a: Element | undefined) {
        this.a = a;
      }
    }
    validate(TestStruct);
    const expectedResult: StructKind = new StructKind({
      fields: [
        {
          key: "a",
          type: option(Element),
        },
      ],
    });
    expect(getSchema(TestStruct)).toEqual(expectedResult);
    const bufSome = serialize(new TestStruct(new Element(123)));
    expect(new Uint8Array(bufSome)).toEqual(new Uint8Array([1, 123]));
    const deserializedSome = deserialize(new Uint8Array(bufSome), TestStruct);
    expect(deserializedSome.a).toEqual(new Element(123));

    const bufNone = serialize(new TestStruct(undefined));
    expect(new Uint8Array(bufNone)).toEqual(new Uint8Array([0]));
    const deserialized = deserialize(new Uint8Array(bufNone), TestStruct);
    expect(deserialized.a).toBeUndefined();
  });

  test("empty string option", () => {
    class TestStruct {
      @field({ type: option("string") })
      string: string;

      constructor(string: string) {
        this.string = string;
      }
    }
    expect(
      deserialize(serialize(new TestStruct("")), TestStruct).string
    ).toEqual("");
  });

  test("0 number option", () => {
    class TestStruct {
      @field({ type: option("u8") })
      number: number;

      constructor(number: number) {
        this.number = number;
      }
    }
    expect(
      deserialize(serialize(new TestStruct(0)), TestStruct).number
    ).toEqual(0);
  });
  test("unexpected byte will throw", () => {
    class TestStruct {
      @field({ type: option("u8") })
      number: number;

      constructor(number: number) {
        this.number = number;
      }
    }

    // option should either be 0 or 1 (not 2)
    expect(() =>
      deserialize(new Uint8Array([2, 0]), TestStruct)
    ).toThrowError();
  });
});

describe("string", () => {
  class TestStruct {
    @field({ type: "string" })
    public a: string;

    @field({ type: "u8" })
    public b: number;

    @field({ type: "string" })
    public c: string;

    constructor(a: string, b: number, c: string) {
      this.a = a;
      this.b = b;
      this.c = c;
    }
  }
  test("field string", () => {
    validate(TestStruct);
    const bufSome = serialize(new TestStruct("a string 😊", 123, "that ends"));
    expect(new Uint8Array(bufSome)).toEqual(
      new Uint8Array([
        13, 0, 0, 0, 97, 32, 115, 116, 114, 105, 110, 103, 32, 240, 159, 152,
        138, 123, 9, 0, 0, 0, 116, 104, 97, 116, 32, 101, 110, 100, 115,
      ])
    );
    const deserializedSome = deserialize(bufSome, TestStruct);
    const deserializedSomeUint8Array = deserialize(
      new Uint8Array(bufSome),
      TestStruct
    );
    expect(deserializedSome).toMatchObject(deserializedSomeUint8Array);
    expect(deserializedSome.a).toEqual("a string 😊");
    expect(deserializedSome.b).toEqual(123);
    expect(deserializedSome.c).toEqual("that ends");
  });

  test("large string", () => {
    let first = Buffer.from(crypto.randomBytes(10000)).toString("hex");
    const bufSome = serialize(new TestStruct(first, 123, "that ends"));
    const deserializedSome = deserialize(bufSome, TestStruct);
    const deserializedSomeFromUint8Array = deserialize(
      new Uint8Array(bufSome),
      TestStruct
    );

    expect(deserializedSome).toMatchObject(deserializedSomeFromUint8Array);
    expect(deserializedSome.a).toEqual(first);
    expect(deserializedSome.b).toEqual(123);
    expect(deserializedSome.c).toEqual("that ends");
  });

  test("large string", () => {
    let first = Buffer.from(crypto.randomBytes(10000)).toString("hex");
    const bufSome = serialize(new TestStruct(first, 123, "that ends"));
    const deserializedSome = deserialize(bufSome, TestStruct);
    const deserializedSomeFromUint8Array = deserialize(
      new Uint8Array(bufSome),
      TestStruct
    );

    expect(deserializedSome).toMatchObject(deserializedSomeFromUint8Array);
    expect(deserializedSome.a).toEqual(first);
    expect(deserializedSome.b).toEqual(123);
    expect(deserializedSome.c).toEqual("that ends");
  });

  test("uint8array overflow will throw error", () => {
    // length 2 in u32 and string represented in length 1  (not ok)
    expect(() =>
      new BinaryReader(new Uint8Array([2, 0, 0, 0, 0])).string()
    ).toThrowError(
      new BorshError("Error decoding UTF-8 string: Invalid length")
    );

    // length 1 in u32 and tring represented in length 1  (ok)
    new BinaryReader(new Uint8Array([1, 0, 0, 0, 0])).string();
  });

  test("buffer overflow will throw error", () => {
    // length 2 in u32 and string represented in length 1  (not ok)
    expect(() =>
      BinaryReader.bufferString(new BinaryReader(Buffer.from([2, 0, 0, 0, 0])))
    ).toThrowError(
      new BorshError("Error decoding UTF-8 string: Invalid length")
    );

    // length 1 in u32 and tring represented in length 1  (ok)
    BinaryReader.bufferString(new BinaryReader(Buffer.from([1, 0, 0, 0, 0])));
  });

  test("custom uint8array overflow will throw error", () => {
    // length 2 in u32 and string represented in length 1  (not ok)
    expect(() =>
      BinaryReader.stringCustom(new BinaryReader(new Uint8Array([0])), () => 2)
    ).toThrowError(
      new BorshError("Error decoding UTF-8 string: Invalid length")
    );

    // length 1 in u32 and tring represented in length 1  (ok)
    BinaryReader.stringCustom(new BinaryReader(new Uint8Array([0])), () => 1);
  });

  test("custom buffer overflow will throw error", () => {
    // length 2 in u32 and string represented in length 1  (not ok)
    expect(() =>
      BinaryReader.stringCustom(new BinaryReader(Buffer.from([0])), () => 2)
    ).toThrowError(
      new BorshError("Error decoding UTF-8 string: Invalid length")
    );

    // length 1 in u32 and tring represented in length 1  (ok)
    BinaryReader.stringCustom(new BinaryReader(Buffer.from([0])), () => 1);
  });

  test("custom length", () => {
    class TestStructCustom {
      @field({ type: string("u8") })
      public a: string;

      @field({ type: "u8" })
      public b: number;

      @field({ type: string("u32") })
      public c: string;

      @field({ type: string("u16") })
      public d: string;

      constructor(a: string, b: number, c: string, d: string) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
      }
    }
    validate(TestStructCustom);

    const bufSome = serialize(
      new TestStructCustom("a string 😊", 123, "that ends", "somewhere")
    );
    expect(new Uint8Array(bufSome)).toEqual(
      new Uint8Array([
        13, 97, 32, 115, 116, 114, 105, 110, 103, 32, 240, 159, 152, 138, 123,
        9, 0, 0, 0, 116, 104, 97, 116, 32, 101, 110, 100, 115, 9, 0, 115, 111,
        109, 101, 119, 104, 101, 114, 101,
      ])
    );
    const deserializedSome = deserialize(bufSome, TestStructCustom);
    const deserializedSomeUint8Array = deserialize(
      new Uint8Array(bufSome),
      TestStructCustom
    );
    expect(deserializedSome).toMatchObject(deserializedSomeUint8Array);
    expect(deserializedSome.a).toEqual("a string 😊");
    expect(deserializedSome.b).toEqual(123);
    expect(deserializedSome.c).toEqual("that ends");
    expect(deserializedSome.d).toEqual("somewhere");
  });
});

describe("options", () => {
  class Test {
    @field({ type: "u8" })
    number: number;
    constructor(number: number) {
      this.number = number;
    }
  }
  test("pass writer", () => {
    const writer = new BinaryWriter();
    writer.u8(1);
    expect(new Uint8Array(serialize(new Test(123), writer))).toEqual(
      new Uint8Array([1, 123])
    );
  });
});

describe("override", () => {
  describe("serializer", () => {
    class TestStruct {
      @serializer()
      override(writer: BinaryWriter) {
        writer.u8(1);
      }
    }

    class TestStructMixed {
      @field({ type: TestStruct })
      nested: TestStruct;

      @field({ type: "u8" })
      number: number;

      cached: Uint8Array;

      constructor(number: number) {
        this.nested = new TestStruct();
        this.number = number;
      }

      @serializer()
      override(writer: BinaryWriter, serialize: (obj: this) => Uint8Array) {
        if (this.cached) {
          writer.set(this.cached);
        } else {
          this.cached = serialize(this);
          writer.set(this.cached);
        }
      }
    }

    class TestStructMixedNested {
      @field({ type: TestStructMixed })
      nested: TestStructMixed;

      @field({ type: "u8" })
      number: number;

      cached: Uint8Array;

      constructor(number: number) {
        this.nested = new TestStructMixed(number);
        this.number = number;
      }

      @serializer()
      override(writer: BinaryWriter, serialize: (obj: this) => Uint8Array) {
        if (this.cached) {
          writer.set(this.cached);
        } else {
          this.cached = serialize(this);
          writer.set(this.cached);
        }
      }
    }

    class TestStructNested {
      @field({ type: TestStruct })
      nested: TestStruct;

      @field({ type: "u8" })
      number: number;
      constructor() {
        this.nested = new TestStruct();
        this.number = 2;
      }
    }

    class TestBaseClass {
      @serializer()
      override(writer: BinaryWriter) {
        writer.u8(3);
      }
    }
    @variant(2)
    class TestStructInherited extends TestBaseClass {
      @field({ type: TestStruct })
      struct: TestStruct;

      @field({ type: "u8" })
      number: number;
      constructor() {
        super();
        this.struct = new TestStruct();
        this.number = 0;
      }
    }

    test("struct", () => {
      expect(new Uint8Array(serialize(new TestStruct()))).toEqual(
        new Uint8Array([1])
      );
    });
    test("recursive call", () => {
      const obj = new TestStructMixed(2);
      expect(new Uint8Array(serialize(obj))).toEqual(new Uint8Array([1, 2]));
      expect(new Uint8Array(obj.cached)).toEqual(new Uint8Array([1, 2]));
      expect(new Uint8Array(serialize(obj))).toEqual(new Uint8Array([1, 2]));
    });
    test("recursive call nested", () => {
      const obj = new TestStructMixedNested(2);
      expect(new Uint8Array(serialize(obj))).toEqual(new Uint8Array([1, 2, 2]));
      expect(new Uint8Array(obj.cached)).toEqual(new Uint8Array([1, 2, 2]));
      expect(new Uint8Array(obj.nested.cached)).toEqual(new Uint8Array([1, 2]));

      expect(new Uint8Array(serialize(obj))).toEqual(new Uint8Array([1, 2, 2]));
    });

    test("nested", () => {
      expect(new Uint8Array(serialize(new TestStructNested()))).toEqual(
        new Uint8Array([1, 2])
      );
    });

    test("inherited", () => {
      expect(new Uint8Array(serialize(new TestStructInherited()))).toEqual(
        new Uint8Array([3, 2, 1, 0])
      );
    });
  });
  test("serialize/deserialize", () => {
    /**
     * Serialize field with custom serializer and deserializer
     */
    class TestStruct {
      @field({
        serialize: (value: number, writer: BinaryWriter) => {
          writer.u16(value);
        },
        deserialize: (reader: BinaryReader): number => {
          return reader.u16();
        },
      })
      public number: number;
      constructor(number?: number) {
        this.number = number;
      }
    }

    validate(TestStruct);
    const serialized = serialize(new TestStruct(3));
    const deserialied = deserialize(new Uint8Array(serialized), TestStruct);
    expect(deserialied.number).toEqual(3);
  });

  test("custom option", () => {
    /**
     * Serialize field with custom serializer and deserializer
     */

    class TestStruct {
      @field({
        serialize: (value: number | undefined, writer: BinaryWriter) => {
          if (typeof value !== "number") {
            writer.u8(0);
            return;
          }
          writer.u8(1);
          writer.u32(value);
        },
        deserialize: (reader: BinaryReader): number => {
          const option = reader.u8();
          if (option === 0) {
            return undefined;
          }
          return reader.u32();
        },
      })
      public number?: number;
      constructor(number?: number) {
        this.number = number;
      }
    }
    expect(
      deserialize(
        new Uint8Array(serialize(new TestStruct(undefined))),
        TestStruct
      ).number
    ).toBeUndefined();
    expect(
      deserialize(new Uint8Array(serialize(new TestStruct(1))), TestStruct)
        .number
    ).toEqual(1);
  });

  test("nested override", () => {
    /**
     * Serialize field with custom serializer and deserializer
     */

    class TestStruct {
      @field({
        type: option({
          serialize: (value: number, writer: BinaryWriter) => {
            writer.u8(value);
          },
          deserialize: (reader: BinaryReader): number => {
            return reader.u8();
          },
        }),
      })
      public number?: number;
      constructor(number?: number) {
        this.number = number;
      }
    }

    validate(TestStruct);

    // with value
    const serialized = serialize(new TestStruct(123));
    expect(new Uint8Array(serialized)).toStrictEqual(new Uint8Array([1, 123]));
    const deserialied = deserialize(new Uint8Array(serialized), TestStruct);
    expect(deserialied.number).toEqual(123);

    // without value
    const serializedNone = serialize(new TestStruct(undefined));
    expect(new Uint8Array(serializedNone)).toStrictEqual(new Uint8Array([0]));
  });
});

describe("order", () => {
  test("explicit serialization/deserialization", () => {
    class TestStruct {
      @field({ type: "u8", index: 1 })
      public a: number;

      @field({ type: "u8", index: 0 })
      public b: number;

      constructor(a?: number, b?: number) {
        this.a = a;
        this.b = b;
      }
    }
    validate(TestStruct);
    const expectedResult: StructKind = new StructKind({
      fields: [
        {
          key: "b",
          type: "u8",
        },

        {
          key: "a",
          type: "u8",
        },
      ],
    });
    expect(getSchema(TestStruct)).toEqual(expectedResult);
    const serialized = serialize(new TestStruct(2, 3));
    const deserialied = deserialize(new Uint8Array(serialized), TestStruct);
    expect(deserialied).toBeDefined();
    expect(deserialied.a).toEqual(2);
    expect(deserialied.b).toEqual(3);
  });

  test("explicit non zero offset", () => {
    class TestStruct {
      @field({ type: "u8", index: 1 })
      public a: number;
    }
    const thrower = (): void => {
      validate(TestStruct);
    };

    // Error is thrown since 1 field with index 1 is undefined behaviour
    // Expect first index to be 0
    expect(thrower).toThrow(BorshError);
  });

  test("explicit gaps", () => {
    class TestStruct {
      @field({ type: "u8", index: 0 })
      public a: number;
      @field({ type: "u8", index: 2 })
      public b: number;
    }
    const thrower = (): void => {
      validate(TestStruct);
    };

    // Error is thrown since missing field with index 1
    // Expected no gaps
    expect(thrower).toThrow(BorshError);
  });

  test("implicit", () => {
    class TestStruct {
      @field({ type: "u8" })
      public a: number;

      @field({ type: "u8" })
      public b: number;
    }
    validate(TestStruct);
    const schema = getSchema(TestStruct);

    const expectedResult: StructKind = new StructKind({
      fields: [
        {
          key: "a",
          type: "u8",
        },
        {
          key: "b",
          type: "u8",
        },
      ],
    });
    expect(schema).toEqual(expectedResult);
  });
});

describe("discriminator", () => {
  test("can resolve", () => {
    @variant([1, 2])
    class A {}
    class B extends A {}
    @variant(3)
    class C extends B {}

    @variant("abc")
    class D extends C {
      @field({ type: "string" })
      string: string = "string";
    }

    const discriminator = getDiscriminator(D);
    expect(new Uint8Array(discriminator)).toEqual(
      new Uint8Array([1, 2, 3, 3, 0, 0, 0, 97, 98, 99])
    );
  });

  test("will reject for undefined behahiour, with super variant", () => {
    @variant([1, 2])
    class A {
      @field({ type: "string" })
      string: string = "string";
    }
    @variant(3)
    class B extends A {}
    expect(() => getDiscriminator(B)).toThrowError(BorshError);
  });

  test("will reject for undefined behahiour, without super variant", () => {
    class A {
      @field({ type: "string" })
      string: string = "string";
    }
    @variant(3)
    class B extends A {}
    expect(() => getDiscriminator(B)).toThrowError(BorshError);
  });
});
describe("Validation", () => {
  test("padding checked/unchecked", () => {
    class TestStruct {
      @field({ type: "u8" })
      public a: number;

      constructor(a?: number) {
        this.a = a;
      }
    }

    const bytes = Uint8Array.from([1, 0]); // has an extra 0
    validate(TestStruct);
    expect(() => deserialize(new Uint8Array(bytes), TestStruct)).toThrowError(
      BorshError
    );
    expect(
      deserialize(new Uint8Array(bytes), TestStruct, { unchecked: true }).a
    ).toEqual(1);
  });

  test("undefined struct error", () => {
    class Value {
      constructor() {}
    }

    class Container {
      @field({ type: Value })
      v: Value;
    }

    expect(() => serialize(new Container())).toThrowError(BorshError);
    expect(() => serialize(new Container())).toThrow(
      'Trying to serialize a null value to field "v" which is not allowed since the field is not decorated with "option(...)" but "Value". Most likely you have forgotten to assign this value before serializing'
    );
  });
  test("undefined number error", () => {
    class Container {
      @field({ type: "u64" })
      v: number;
    }

    expect(() => serialize(new Container())).toThrowError(BorshError);
    expect(() => serialize(new Container())).toThrow(
      'Trying to serialize a null value to field "v" which is not allowed since the field is not decorated with "option(...)" but "u64". Most likely you have forgotten to assign this value before serializing'
    );
  });

  test("error for non optimized code", () => {
    class Super {
      constructor() {}
    }

    class A extends Super {
      @field({ type: "string" })
      string: string;
    }

    class B extends Super {
      @field({ type: "string" })
      string: string;
    }
    expect(() => validate(Super)).toThrowError(BorshError);
  });

  test("valid dependency", () => {
    class Implementation {
      @field({ type: "u8" })
      public someField: number;
      constructor(someField?: number) {
        this.someField = someField;
      }
    }

    class TestStruct {
      @field({ type: Implementation })
      public missing: Implementation;

      constructor(missing?: Implementation) {
        this.missing = missing;
      }
    }
    validate(TestStruct);
  });

  test("missing value will throw", () => {
    class TestStruct {
      @field({ type: "u32" })
      number: number;
    }

    expect(() => serialize(new TestStruct())).toThrowError(
      'Trying to serialize a null value to field "number" which is not allowed since the field is not decorated with "option(...)" but "u32". Most likely you have forgotten to assign this value before serializing'
    );
  });

  test("valid dependency deep", () => {
    class Super {
      constructor() {}
    }

    @variant(0)
    class A extends Super {}

    @variant(1)
    class B extends A {}

    class Clazz {
      @field({ type: Super })
      clazz: Super;

      constructor(clazz?: Super) {
        this.clazz = clazz;
      }
    }
    // We pass Other as clazz, but Other does not extend Super, this
    // is a problem, because this prevents deserialization to work correctly
    // serialization could in practice work, but would be meaningless by thisk
    validate([Clazz, Super]);
    serialize(new Clazz(new B()));
  });

  test("invalid dependency runtime", () => {
    class Super {
      constructor() {}
    }

    @variant(0)
    class A extends Super {}

    @variant(1)
    class Other {}

    class Clazz {
      @field({ type: Super })
      clazz: Super;

      constructor(clazz?: Super) {
        this.clazz = clazz;
      }
    }
    // We pass Other as clazz, but Other does not extend Super, this
    // is a problem, because this prevents deserialization to work correctly
    // serialization could in practice work, but would be meaningless by thisk
    expect(() => serialize(new Clazz(new Other()))).toThrow(BorshError);
  });

  test("error for non optimized code on deserialization", () => {
    class TestStruct {
      constructor() {}
    }

    class A extends TestStruct {
      @field({ type: "string" })
      string: string = "A";
    }

    class B extends TestStruct {
      @field({ type: "string" })
      string: string = "B";
    }
    expect(() =>
      deserialize(new Uint8Array(serialize(new A())), TestStruct)
    ).toThrowError(BorshError);
  });

  test("variant conflict, indices", () => {
    const classDef = () => {
      class TestStruct {
        constructor() {}
      }
      @variant([0, 1, 2]) // Same as B
      class A extends TestStruct {
        constructor() {
          super();
        }
      }

      @variant([0, 1, 2]) // Same as A
      class B extends TestStruct {
        constructor() {
          super();
        }
      }
      return [A, B, TestStruct];
    };
    expect(() => classDef()).toThrowError(BorshError);
  });

  test("variant conflict, indices length", () => {
    const classDef = () => {
      class TestStruct {
        constructor() {}
      }
      @variant([0, 1]) // Same as B
      class A extends TestStruct {
        constructor() {
          super();
        }
      }

      @variant([0, 1, 2]) // Same as A
      class B extends TestStruct {
        constructor() {
          super();
        }
      }
      return [A, B, TestStruct];
    };
    expect(() => classDef()).toThrowError(BorshError);
  });

  test("variant conflict, indices deep inheritance", () => {
    const classDef = () => {
      class TestStructSuper {
        constructor() {}
      }
      class TestStruct extends TestStructSuper {
        constructor() {
          super();
        }
      }
      @variant([0, 1]) // Same as B
      class A extends TestStruct {
        constructor() {
          super();
        }
      }

      @variant([0, 1, 2]) // Same as A
      class B extends TestStructSuper {
        constructor() {
          super();
        }
      }
      return [A, B, TestStruct];
    };
    expect(() => classDef()).toThrowError(BorshError);
  });

  test("variant conflict, index", () => {
    const classDef = () => {
      class TestStruct {
        constructor() {}
      }
      @variant(0) // Same as B
      class A extends TestStruct {
        constructor() {
          super();
        }
      }

      @variant(0) // Same as A
      class B extends TestStruct {
        constructor() {
          super();
        }
      }
      return [A, B, TestStruct];
    };
    expect(() => classDef()).toThrowError(BorshError);
  });

  test("undefined throws error", () => {
    class MissingImplementation {
      public someField: number;
      constructor(someField?: number) {
        this.someField = someField;
      }
    }

    class TestStruct {
      @field({ type: MissingImplementation })
      public missing: MissingImplementation;

      constructor(missing?: MissingImplementation) {
        this.missing = missing;
      }
    }
    expect(() => validate(TestStruct)).toThrowError(BorshError);
    validate(TestStruct, true); // Should be ok since we allow undefined
  });
});

describe("deserialize input type", () => {
  test("buffer compat", () => {
    class Clazz {
      @field({ type: "string" })
      string: string;

      constructor(string?: string) {
        this.string = string;
      }
    }
    const ser = serialize(new Clazz("hello"));
    const derA = deserialize(ser, Clazz);
    const derB = deserialize(Buffer.from(ser), Clazz);
    expect(derA.string).toEqual("hello");
    expect(derB.string).toEqual(derA.string);
  });

  test("uint8array with offset", () => {
    class Clazz {
      @field({ type: Uint8Array })
      arr: Uint8Array;

      constructor(arr?: Uint8Array) {
        this.arr = arr;
      }
    }
    const arr = new Uint8Array([1, 2, 3]);
    const ser = serialize(new Clazz(arr));
    const offset = 3;

    const serWithOffset = new Uint8Array([6, 6, 6, ...ser]);
    const der = deserialize(
      new Uint8Array(serWithOffset.buffer, offset, ser.length),
      Clazz
    );
    expect(der.arr).toEqual(arr);
  });

  test("uint8array with bytelength", () => {
    class Clazz {
      @field({ type: Uint8Array })
      arr: Uint8Array;

      constructor(arr?: Uint8Array) {
        this.arr = arr;
      }
    }
    const arr = new Uint8Array([1, 2, 3]);

    const ser = serialize(new Clazz(arr));
    const offset = 3;

    const serWithOffset = new Uint8Array([6, 6, 6, ...ser, 6, 6, 6]);
    const der = deserialize(
      new Uint8Array(serWithOffset.buffer, offset, ser.length),
      Clazz
    );
    expect(der.arr).toEqual(arr);
  });

  test("can alternate between", () => {
    class Clazz {
      @field({ type: option("string") })
      string?: string;

      constructor(string?: string) {
        this.string = string;
      }
    }

    const string = "abc";
    const ser = serialize(new Clazz(string));
    const der = deserialize(ser, Clazz);
    const der2 = deserialize(new Uint8Array(ser), Clazz);
    const der3 = deserialize(ser, Clazz);
    const der4 = deserialize(new Uint8Array(ser), Clazz);
    expect(der.string).toEqual(string);
    expect(der2.string).toEqual(string);
    expect(der3.string).toEqual(string);
    expect(der4.string).toEqual(string);
  });
});
