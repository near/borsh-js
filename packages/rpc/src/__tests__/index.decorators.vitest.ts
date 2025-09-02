import { describe, it, expect } from 'vitest';
import { field, vec } from '@dao-xyz/borsh';
import { service, method, subservice, LoopbackPair, createProxyFromService, bindService } from '../index.js';

describe('rpc decorators', () => {
    it('class and method decorators wire schema and helpers', async () => {
        class Payload { @field({ type: 'u8' }) x: number; constructor(x?: number) { this.x = x ?? 0; } }
        class Result { @field({ type: Payload }) p: Payload; constructor(p?: Payload) { this.p = p ?? new Payload(); } }

        @service()
        class API {
            @method({ args: 'u32', returns: 'u32' })
            addOne(n: number): number { return n + 1; }

            @method({ args: Payload, returns: Result })
            echo(p: Payload): Result { return new Result(new Payload(p.x)); }

            @method({ args: ['u8', 'u8', 'u8'], returns: 'u16' })
            sum(a: number, b: number, c: number): Promise<number> { return Promise.resolve(a + b + c); }

            @method({ returns: 'u32' })
            fail(): Promise<number> { return Promise.reject(new Error('nope')); }

            @method({ returns: 'void' })
            open(): Promise<void> { return Promise.resolve(); }

            @method({ args: 'u8', returns: { stream: 'u8' } })
            stream(n: number): AsyncIterable<number> {
                async function* gen() { for (let i = 0; i < n; i++) yield i; }
                return gen();
            }
            @method({ returns: { stream: 'u8' } })
            streamFail(): AsyncIterable<number> {
                async function* gen() { yield 1; throw new Error('boom'); }
                return gen();
            }
        }

        const loop = new LoopbackPair();
        // bind using static helper (auto-constructs instance)
        const unsub = bindService(API, loop.a);

        // create proxy using static helper
        const client1 = createProxyFromService(API, loop.b);
        expect(await client1.addOne(10)).toBe(11);
        const r1 = await client1.echo(new Payload(5));
        expect(r1.p.x).toBe(5);

        // Or via generated Proxy class
        const ClientProxy = (API as any).Proxy as new (t: any) => InstanceType<typeof API>;
        const client2 = new ClientProxy(loop.b);
        expect(await client2.addOne(20)).toBe(21);

        // multi-args and error propagation
        expect(await client2.sum(1, 2, 3)).toBe(6);
        await expect(client2.fail()).rejects.toThrow('nope');

        // awaitable void
        await client2.open();

        // streaming success
        const seen: number[] = [];
        for await (const x of client2.stream(3)) seen.push(x);
        expect(seen).toEqual([0, 1, 2]);
        // streaming error
        await expect((async () => { for await (const _ of client2.streamFail()) { } })()).rejects.toThrow('boom');

        unsub();
    });

    it('vec(SubClass) args and result', async () => {
        class Item { @field({ type: 'u16' }) n: number; constructor(n?: number) { this.n = n ?? 0; } }
        class Out { @field({ type: vec(Item) }) items: Item[]; constructor(items?: Item[]) { this.items = items ?? []; } }

        @service()
        class API {
            @method({ args: vec(Item), returns: Out })
            doubleAll(arr: Item[]): Out { return new Out(arr.map(x => new Item(x.n * 2))); }
        }
        const loop = new LoopbackPair();
        const unsub = bindService(API, loop.a);
        const client = createProxyFromService(API, loop.b);
        const res = await client.doubleAll([new Item(1), new Item(3)]);
        expect(res.items.map((i: any) => i.n)).toEqual([2, 6]);
        unsub();
    });

    it('nested services to any depth', async () => {
        @service()
        class D {
            @method({ args: 'u32', returns: 'u32' })
            inc(n: number) { return n + 1; }
        }
        @service()
        class C {
            @subservice(D) d!: D;
            @method({ returns: 'string' })
            id() { return 'C'; }
        }
        @service()
        class B {
            @subservice(C) c!: C;
            @method({ args: 'string', returns: 'string' })
            echo(s: string) { return s; }
        }
        @service()
        class A {
            @subservice(B) b!: B;
        }
        const loop = new LoopbackPair();
        const unsub = bindService(A, loop.a);
        const client = createProxyFromService(A, loop.b);
        expect(await client.b.echo('hi')).toBe('hi');
        expect(await client.b.c.id()).toBe('C');
        expect(await client.b.c.d.inc(41)).toBe(42);
        unsub();
    });

    it('class with two subservices', async () => {
        @service()
        class Left {
            @method({ args: 'u32', returns: 'u32' })
            twice(n: number) { return n * 2; }
        }
        @service()
        class Right {
            @method({ args: 'string', returns: 'string' })
            shout(s: string) { return s + '!'; }
        }
        @service()
        class Root {
            @subservice(Left) left!: Left;
            @subservice(Right) right!: Right;
        }
        const loop = new LoopbackPair();
        const unsub = bindService(Root, loop.a);
        const client = createProxyFromService(Root, loop.b);
        expect(await client.left.twice(7)).toBe(14);
        expect(await client.right.shout('hi')).toBe('hi!');
        unsub();
    });
});
