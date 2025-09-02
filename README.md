## borsh-ts monorepo

[![Project license](https://img.shields.io/badge/license-Apache2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Project license](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![NPM @dao-xyz/borsh](https://img.shields.io/npm/v/@dao-xyz/borsh.svg?style=flat-square)](https://npmjs.com/@dao-xyz/borsh)
[![NPM @dao-xyz/borsh-rpc](https://img.shields.io/npm/v/@dao-xyz/borsh-rpc.svg?style=flat-square)](https://npmjs.com/@dao-xyz/borsh-rpc)

Two packages:

- @dao-xyz/borsh — Core Borsh serializer with decorators.
- @dao-xyz/borsh-rpc — Lightweight RPC over Borsh.

This root README gives a quick taste. Full documentation lives in each subpackage README.

## Quick taste: @dao-xyz/borsh

```ts
import { field, serialize, deserialize } from '@dao-xyz/borsh';

class User {
  @field({ type: 'u32' }) id!: number;
  @field({ type: 'string' }) name!: string;
  constructor(init?: Partial<User>) { Object.assign(this, init); }
}

const bytes = serialize(new User({ id: 1, name: 'alice' }));
const u = deserialize(bytes, User);
```

Full docs: packages/borsh/README.md

## Quick taste: @dao-xyz/borsh-rpc

```ts
import { field } from '@dao-xyz/borsh';
import { service, method, LoopbackPair, createProxyFromService, bindService } from '@dao-xyz/borsh-rpc';

class Payload { @field({ type: 'u8' }) x = 0; }

@service()
class API {
  @method({ args: 'u32', returns: 'u32' }) addOne(n: number) { return n + 1; }
}

const loop = new LoopbackPair();
const unsub = bindService(API, loop.a);
const client = createProxyFromService(API, loop.b);
await client.addOne(41); // 42
unsub();
```

Full docs: packages/rpc/README.md

## Development

```bash
yarn install
yarn build
yarn workspaces:test
```

## License
Apache-2.0 and MIT. See LICENSE files.
