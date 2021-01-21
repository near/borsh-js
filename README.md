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

```javascript

class Foo {
  constructor(data) {
    // The deserializer decodes bytes into an object, and pass that as
    // the only argument to the constructor
    //
    // This constructor assign the keys-values to `this`.
    Object.assign(this, data)
  }
}

class Bar {
  constructor(data) {
    Object.assign(this, data)
  }
}

// The schema is an ES5 Map, passing tuples into its constructor.
const schema = new Map([
  // schema for the Foo constructor
  [Foo,
    {
      kind: "struct",
      fields: [
        // map to Bar
        ["bar", Bar],

        // map to dynamic array of bars
        // ["bars", [Bar]],

        // map to fixed-length array of bars (3)
        // ["fixedBars", [Bar, 3]],

        // map to UInt8Array if the array type is omitted
        // ["someBytes", [3]],
      ],
    },
  ],

  // schema for the Bar constructor
  [Bar,
    {
      kind: "struct",
      fields: [
        // map to number
        ["x", "u8"],
        // map to BN from bn.js
        ["y", "u64"],
      ],
    },
  ],
]);

const bar = new Bar({
  x: 10,
  y: new BN("1234"),
})

const foo = new Foo({
  bar,
});

// serializes to UInt8Array
const buffer = borsh.serialize(schema, foo);

// deserializes from a buffer to an instance of Foo
const newFoo = borsh.deserialize(schema, Foo, buffer);
```

If you are using TypeScript, you can annotate the properties of the classes like this:

```ts
class Foo {
  public bar!: Bar

  constructor(data) {
    Object.assign(this, data)
  }
}

class Bar {
  public x!: number
  public y!: BN

  constructor(data) {
    Object.assign(this, data)
  }
}
```

## Type Mappings

| Borsh                 | TypeScript     |
|-----------------------|----------------|
| `u8` integer          | `number`       |
| `u16` integer         | `number`       |
| `u32` integer         | `number`       |
| `u64` integer         | `BN`           |
| `u128` integer        | `BN`           |
| `f32` float           | N/A            |
| `f64` float           | N/A            |
| fixed-size byte array | `Uint8Array`   |
| UTF-8 string          | `string`       |
| option                | `null` or type |
| map                   | N/A            |
| set                   | N/A            |
| structs               | `any`          |

## Contributing

Install dependencies:
```bash
yarn install
```

Continuesly build with:
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