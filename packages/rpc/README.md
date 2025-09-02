# @dao-xyz/borsh-rpc

[![NPM @dao-xyz/borsh-rpc](https://img.shields.io/npm/v/@dao-xyz/borsh-rpc.svg?style=flat-square)](https://npmjs.com/@dao-xyz/borsh-rpc)

Lightweight RPC over Borsh-encoded messages with decorators and schema-driven proxies.

- Message framing: Request/Ok/Err/Stream/StreamEnd/StreamErr.
- Decorators: `@service`, `@method`, `@subservice` generate schema and helpers.
- Supports primitives and borsh-decorated classes, multiple args, void, promises, and streaming (AsyncIterable).
- Nested services and two-way communication supported.

## Install

```bash
npm install @dao-xyz/borsh @dao-xyz/borsh-rpc
# or
yarn add @dao-xyz/borsh @dao-xyz/borsh-rpc
```

## Quick start

```ts
import { field } from '@dao-xyz/borsh';
import { service, method, LoopbackPair, createProxyFromService, bindService } from '@dao-xyz/borsh-rpc';

class Payload { @field({ type: 'u8' }) x = 0; constructor(x?: number){ if(x!=null) this.x=x; } }

@service()
class API {
  @method({ args: 'u32', returns: 'u32' }) addOne(n: number) { return n + 1; }
  @method({ args: Payload, returns: Payload }) echo(p: Payload) { return new Payload(p.x); }
}

const loop = new LoopbackPair();
const unsub = bindService(API, loop.a);
const client = createProxyFromService(API, loop.b);

await client.addOne(41); // 42
await client.echo(new Payload(7)); // Payload(7)
unsub();
```

## Multiple args and void returns

```ts
@service()
class MathAPI {
  @method({ args: ['u16','u16','u16'], returns: 'u32' }) sum(a: number,b: number,c: number){ return a+b+c; }
  @method({ returns: 'void' }) open(): Promise<void> { return Promise.resolve(); }
}
```

## Streaming (AsyncIterable)

```ts
@service()
class StreamAPI {
  @method({ args: 'u8', returns: { stream: 'u8' } })
  stream(n: number): AsyncIterable<number> {
    async function* gen(){ for(let i=0;i<n;i++) yield i; }
    return gen();
  }
}
```

## Nested services and two subservices

```ts
@service() class Left { @method({ args:'u32', returns:'u32' }) twice(n: number){ return n*2; } }
@service() class Right { @method({ args:'string', returns:'string' }) shout(s: string){ return s+'!'; } }
@service() class Root { @subservice(Left) left!: Left; @subservice(Right) right!: Right; }
```

## Two-way communication

Bind two services on each side of a transport and call in both directions.

See full examples in `src/__tests__`.
