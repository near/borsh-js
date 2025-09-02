import { field, variant, serialize, deserialize } from '@dao-xyz/borsh';
import { createRpcProxy, bindRpcReceiver, LoopbackPair, type RpcSchema } from '../index.js';
import { describe, test, expect } from 'vitest';

describe('rpc', () => {
    test('primitive arg and return', async () => {
        class API {
            addOne(_arg: number): number { return _arg + 1; }
        }
        const schema: RpcSchema<API> = { addOne: { args: 'u32', returns: 'u32' } };
        const loop = new LoopbackPair();
        const srv = new API();
        const unsub = bindRpcReceiver(srv, loop.a, schema);
        const client = createRpcProxy<API>(loop.b, schema);
        const r = await (client as any).addOne(41);
        expect(r).toBe(42);
        unsub();
    });

    test('borsh-decorated payload and return', async () => {
        class Payload {
            @field({ type: 'u8' }) x: number;
            constructor(x?: number) { this.x = x; }
        }
        class Result {
            @field({ type: Payload }) p: Payload;
            constructor(p?: Payload) { this.p = p; }
        }
        class API {
            echo(arg: Payload): Result { return new Result(new Payload(arg.x)); }
        }
        const schema: RpcSchema<API> = { echo: { args: Payload, returns: Result } };
        const loop = new LoopbackPair();
        const srv = new API();
        const unsub = bindRpcReceiver(srv, loop.a, schema);
        const client = createRpcProxy<API>(loop.b, schema);
        const out = await client.echo(new Payload(7));
        expect(out).toBeInstanceOf(Result);
        expect(out.p).toBeInstanceOf(Payload);
        expect(out.p.x).toBe(7);
        unsub();
    });
});
