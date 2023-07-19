"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.expect_same_size = exports.expect_BN = exports.expect_type = exports.isArrayLike = void 0;
const bn_js_1 = __importDefault(require("bn.js"));
function isArrayLike(value) {
    // source: https://stackoverflow.com/questions/24048547/checking-if-an-object-is-array-like
    return (Array.isArray(value) ||
        (!!value &&
            typeof value === 'object' &&
            'length' in value &&
            typeof (value.length) === 'number' &&
            (value.length === 0 ||
                (value.length > 0 &&
                    (value.length - 1) in value))));
}
exports.isArrayLike = isArrayLike;
function expect_type(value, type) {
    if (typeof (value) !== type) {
        throw new Error(`Expected ${type} not ${typeof (value)}(${value})`);
    }
}
exports.expect_type = expect_type;
function expect_BN(value) {
    if (!(value instanceof bn_js_1.default)) {
        throw new Error(`Expected BN not ${typeof (value)}(${value})`);
    }
}
exports.expect_BN = expect_BN;
function expect_same_size(length, expected) {
    if (length !== expected) {
        throw new Error(`Array length ${length} does not match schema length ${expected}`);
    }
}
exports.expect_same_size = expect_same_size;
