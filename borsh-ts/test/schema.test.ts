import { BorshError } from "../error";
import { serialize } from "../index";
import { generateSchemas, StructKind, Field, Variant } from "../schema";

describe('struct', () => {
    test('any field by string', () => {

        class TestStruct {
            @Field({ type: 'typeA' })
            public a: number;

            @Field({ type: 'typeB' })
            public b: number;

        }



        const generatedSchemas = generateSchemas([TestStruct]).get(TestStruct)
        const expectedResult: StructKind = {
            kind: 'struct',
            fields: [
                ['a', 'typeA'],
                ['b', 'typeB']
            ]
        }
        expect(generatedSchemas).toEqual(expectedResult);
    });

    test('struct fields', () => {

        class InnerStruct {
            @Field({ type: 'typeB' })
            public b: number;

        }

        class TestStruct {
            @Field({ type: InnerStruct })
            public a: InnerStruct;

        }

        const generatedSchemas = generateSchemas([TestStruct])
        expect(generatedSchemas.get(TestStruct)).toEqual({
            kind: 'struct',
            fields: [
                ['a', InnerStruct],
            ]
        });
        expect(generatedSchemas.get(InnerStruct)).toEqual({
            kind: 'struct',
            fields: [
                ['b', 'typeB'],
            ]
        });
    });
})

describe('enum', () => {
    test('enum base', () => {

        @Variant(1)
        class TestEnum {
            @Field({ type: 'u8' })
            public a: number;

            constructor(a: number) {
                this.a = a

            }
        }
        const instance = new TestEnum(3);
        const generatedSchemas = generateSchemas([TestEnum])
        const buf = serialize(generatedSchemas, instance);
        expect(buf).toEqual(Buffer.from([1, 3]));
    });

    test('enum field', () => {

        @Variant(1)
        class TestEnum {
            @Field({ type: 'u8' })
            public a: number;

            constructor(a: number) {
                this.a = a

            }
        }

        class TestStruct {
            @Field({ type: TestEnum })
            public enum: TestEnum;

            constructor(value: TestEnum) {
                this.enum = value
            }
        }
        const instance = new TestStruct(new TestEnum(4));
        const generatedSchemas = generateSchemas([TestStruct])
        const buf = serialize(generatedSchemas, instance);
        expect(buf).toEqual(Buffer.from([1, 4]));
    });

})

describe('option', () => {
    test('field option', () => {

        class TestStruct {
            @Field({ type: 'u8', option: true })
            public a: number;

        }
        const schema: StructKind = generateSchemas([TestStruct]).get(TestStruct)
        expect(schema).toEqual({
            fields: [
                [
                    "a",
                    {
                        kind: 'option',
                        type: 'u8'
                    },
                ]
            ],
            kind: "struct",
        });
    });

})
describe('order', () => {
    test('explicit', () => {

        class TestStruct {
            @Field({ type: 'u8', index: 1 })
            public a: number;


            @Field({ type: 'u8', index: 0 })
            public b: number;


            constructor(a?: number, b?: number) {
                this.a = a
                this.b = b

            }
        }
        const schema: StructKind = generateSchemas([TestStruct]).get(TestStruct)
        expect(schema).toEqual({
            fields: [
                [
                    "b",
                    "u8",
                ],
                [
                    "a",
                    "u8",
                ],
            ],
            kind: "struct",
        });
    });


    test('explicit non zero offset', () => {

        class TestStruct {
            @Field({ type: 'u8', index: 1 })
            public a: number;
        }
        const thrower = () => {
            generateSchemas([TestStruct], true)
        };

        // Error is thrown since 1 field with index 1 is undefined behaviour
        // Expect first index to be 0 
        expect(thrower).toThrow(BorshError);

    });

    test('explicit gaps', () => {

        class TestStruct {
            @Field({ type: 'u8', index: 0 })
            public a: number;
            @Field({ type: 'u8', index: 2 })
            public b: number;
        }
        const thrower = () => {
            generateSchemas([TestStruct], true)
        };

        // Error is thrown since missing field with index 1
        // Expected no gaps
        expect(thrower).toThrow(BorshError);

    });


    test('implicit', () => {

        class TestStruct {
            @Field({ type: 'u8' })
            public a: number;


            @Field({ type: 'u8' })
            public b: number;
        }
        const schema: StructKind = generateSchemas([TestStruct]).get(TestStruct)
        expect(schema).toEqual({
            fields: [
                [
                    "a",
                    "u8",
                ],
                [
                    "b",
                    "u8",
                ],
            ],
            kind: "struct",
        });
    });
})
