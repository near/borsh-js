# Borsh JS

[![Project license](https://img.shields.io/badge/license-Apache2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Project license](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Discord](https://img.shields.io/discord/490367152054992913?label=discord)](https://discord.gg/Vyp7ETM)
[![Travis status](https://travis-ci.com/near/borsh.svg?branch=master)](https://travis-ci.com/near/borsh-js)
[![NPM version](https://img.shields.io/npm/v/borsh.svg?style=flat-square)](https://npmjs.com/borsh)
[![Size on NPM](https://img.shields.io/bundlephobia/minzip/borsh.svg?style=flat-square)](https://npmjs.com/borsh)

**Borsh JS** is an implementation of the [Borsh] binary serialization format for
JavaScript and TypeScript projects.

Borsh stands for _Binary Object Representation Serializer for Hashing_. It is meant to be used in security-critical projects as it prioritizes consistency,
safety, speed, and comes with a strict specification.

## Examples
### Serializing an object
```javascript
const value = new Test({ x: 255, y: 20, z: '123', q: [1, 2, 3] });
const schema = new Map([[Test, { kind: 'struct', fields: [['x', 'u8'], ['y', 'u64'], ['z', 'string'], ['q', [3]]] }]]);
const buffer = borsh.serialize(schema, value);
```

### Deserializing an object
```javascript
const newValue = borsh.deserialize(schema, Test, buffer);
```

## Type Mappings

| Borsh                             | TypeScript     |
|-----------------------------------|----------------|
| `u8` `u16` `u32` `i8` `i16` `i32` | `number`       |
| `u64` `u128` `i64` `i128`         | `bignum`       |
| `f32` `f64`                       | `number`       |
| `f32` `f64`                       | `number`       |
| `bool`                            | `boolean`      |
| UTF-8 string                      | `string`       |
| fixed-size byte array             | `Array`        |
| dynamic sized array               | `Array`        |
| enum                              | N/A            |
| HashMap                           | `Map`          |
| HashSet                           | `Set`          |
| Option                            | `null` or type |

## Contributing

Install dependencies:
```bash
yarn install
```

Continuously build with:
```bash
yarn dev
```

Run tests:
```bash
yarn test
```

Run linter
```bash
yarn lint
```
## Publish

Prepare `dist` version by running:
```bash
yarn build
```

When publishing to npm use [np](https://github.com/sindresorhus/np).

# License
This repository is distributed under the terms of both the MIT license and the Apache License (Version 2.0).
See [LICENSE-MIT](LICENSE-MIT.txt) and [LICENSE-APACHE](LICENSE-APACHE) for details.

[Borsh]:          https://borsh.io
