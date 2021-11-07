"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("../error");
const index_1 = require("../index");
const schema_1 = require("../schema");
describe('struct', () => {
    test('any field by string', () => {
        class TestStruct {
        }
        __decorate([
            schema_1.Field({ type: 'typeA' })
        ], TestStruct.prototype, "a", void 0);
        __decorate([
            schema_1.Field({ type: 'typeB' })
        ], TestStruct.prototype, "b", void 0);
        const generatedSchemas = schema_1.generateSchemas([TestStruct]).get(TestStruct);
        const expectedResult = {
            kind: 'struct',
            fields: [
                ['a', 'typeA'],
                ['b', 'typeB']
            ]
        };
        expect(generatedSchemas).toEqual(expectedResult);
    });
    test('struct fields', () => {
        class InnerStruct {
        }
        __decorate([
            schema_1.Field({ type: 'typeB' })
        ], InnerStruct.prototype, "b", void 0);
        class TestStruct {
        }
        __decorate([
            schema_1.Field({ type: InnerStruct })
        ], TestStruct.prototype, "a", void 0);
        const generatedSchemas = schema_1.generateSchemas([TestStruct]);
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
});
describe('enum', () => {
    test('enum base', () => {
        let TestEnum = class TestEnum {
            constructor(a) {
                this.a = a;
            }
        };
        __decorate([
            schema_1.Field({ type: 'u8' })
        ], TestEnum.prototype, "a", void 0);
        TestEnum = __decorate([
            schema_1.Variant(1)
        ], TestEnum);
        const instance = new TestEnum(3);
        const generatedSchemas = schema_1.generateSchemas([TestEnum]);
        const buf = index_1.serialize(generatedSchemas, instance);
        expect(buf).toEqual(Buffer.from([1, 3]));
    });
    test('enum field', () => {
        let TestEnum = class TestEnum {
            constructor(a) {
                this.a = a;
            }
        };
        __decorate([
            schema_1.Field({ type: 'u8' })
        ], TestEnum.prototype, "a", void 0);
        TestEnum = __decorate([
            schema_1.Variant(1)
        ], TestEnum);
        class TestStruct {
            constructor(value) {
                this.enum = value;
            }
        }
        __decorate([
            schema_1.Field({ type: TestEnum })
        ], TestStruct.prototype, "enum", void 0);
        const instance = new TestStruct(new TestEnum(4));
        const generatedSchemas = schema_1.generateSchemas([TestStruct]);
        const buf = index_1.serialize(generatedSchemas, instance);
        expect(buf).toEqual(Buffer.from([1, 4]));
    });
});
describe('option', () => {
    test('field option', () => {
        class TestStruct {
        }
        __decorate([
            schema_1.Field({ type: 'u8', option: true })
        ], TestStruct.prototype, "a", void 0);
        const schema = schema_1.generateSchemas([TestStruct]).get(TestStruct);
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
});
describe('order', () => {
    test('explicit', () => {
        class TestStruct {
            constructor(a, b) {
                this.a = a;
                this.b = b;
            }
        }
        __decorate([
            schema_1.Field({ type: 'u8', index: 1 })
        ], TestStruct.prototype, "a", void 0);
        __decorate([
            schema_1.Field({ type: 'u8', index: 0 })
        ], TestStruct.prototype, "b", void 0);
        const schema = schema_1.generateSchemas([TestStruct]).get(TestStruct);
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
        }
        __decorate([
            schema_1.Field({ type: 'u8', index: 1 })
        ], TestStruct.prototype, "a", void 0);
        const thrower = () => {
            schema_1.generateSchemas([TestStruct], true);
        };
        // Error is thrown since 1 field with index 1 is undefined behaviour
        // Expect first index to be 0 
        expect(thrower).toThrow(error_1.BorshError);
    });
    test('explicit gaps', () => {
        class TestStruct {
        }
        __decorate([
            schema_1.Field({ type: 'u8', index: 0 })
        ], TestStruct.prototype, "a", void 0);
        __decorate([
            schema_1.Field({ type: 'u8', index: 2 })
        ], TestStruct.prototype, "b", void 0);
        const thrower = () => {
            schema_1.generateSchemas([TestStruct], true);
        };
        // Error is thrown since missing field with index 1
        // Expected no gaps
        expect(thrower).toThrow(error_1.BorshError);
    });
    test('implicit', () => {
        class TestStruct {
            constructor(a, b) {
                this.a = a;
                this.b = b;
            }
        }
        __decorate([
            schema_1.Field({ type: 'u8' })
        ], TestStruct.prototype, "a", void 0);
        __decorate([
            schema_1.Field({ type: 'u8' })
        ], TestStruct.prototype, "b", void 0);
        const schema = schema_1.generateSchemas([TestStruct]).get(TestStruct);
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
});
