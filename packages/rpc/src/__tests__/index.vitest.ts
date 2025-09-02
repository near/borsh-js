import { describe, it, expect } from 'vitest';
import { field } from '@dao-xyz/borsh';
import { createRpcProxy, bindRpcReceiver, LoopbackPair, type RpcSchema, service, method, bindService, createProxyFromService, syncedField } from '../index.js';

describe('rpc-vitest', () => {
    it('primitive add', async () => {
        @service()
        class API {
            @method({ args: 'u32', returns: 'u32' })
            addOne(n: number): number { return n + 1; }
        }
        const loop = new LoopbackPair();
        const unsub = bindService(API, loop.a);
        const client = createProxyFromService(API, loop.b);
        expect(await client.addOne(41)).toBe(42);
        unsub();
    });

    it('borsh objects', async () => {
        class Payload { @field({ type: 'u8' }) x: number; constructor(x?: number) { this.x = x; } }
        class Result { @field({ type: Payload }) p: Payload; constructor(p?: Payload) { this.p = p; } }
        @service()
        class API {
            @method({ args: Payload, returns: Result })
            echo(p: Payload): Result { return new Result(new Payload(p.x)); }
        }
        const loop = new LoopbackPair();
        const unsub = bindService(API, loop.a);
        const client = createProxyFromService(API, loop.b);
        const out = await client.echo(new Payload(9));
        expect(out.p.x).toBe(9);
        unsub();
    });

    it('multiple args and promise returns', async () => {
        @service()
        class API {
            @method({ args: ['u16', 'u16', 'u16'], returns: 'u32' })
            sum(a: number, b: number, c: number): Promise<number> { return Promise.resolve(a + b + c); }
            @method({ returns: 'u32' })
            fail(): Promise<number> { return Promise.reject(new Error('nope')); }
        }
        const loop = new LoopbackPair();
        const unsub = bindService(API, loop.a);
        const client = createProxyFromService(API, loop.b);
        expect(await client.sum(1, 2, 3)).toBe(6);
        await expect(client.fail()).rejects.toThrow('nope');
        unsub();
    });

    it('awaitable void returns', async () => {
        @service()
        class API { @method({ returns: 'void' }) open(): Promise<void> { return Promise.resolve(); } }
        const loop = new LoopbackPair();
        const unsub = (API as any).bind(loop.a);
        const client = new (API as any).Proxy(loop.b) as any;
        await client.open();
        unsub();
    });

    it('async iterator streaming and mid-stream error', async () => {
        @service()
        class API {
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
        const unsub = bindService(API, loop.a);
        const client = createProxyFromService(API, loop.b);
        const items: number[] = [];
        for await (const x of client.stream(5)) items.push(x);
        expect(items).toEqual([0, 1, 2, 3, 4]);
        // error path
        await expect((async () => { for await (const _ of client.streamFail()) { /* consume */ } })()).rejects.toThrow('boom');
        unsub();
    });

    it('two-way communication via dual services', async () => {
        @service()
        class ServerAPI {
            @method({ args: 'string', returns: 'string' })
            echo(s: string) { return s + '!'; }
            // server will use a proxy to call client below
        }
        @service()
        class ClientAPI {
            last: string | undefined;
            @method({ args: 'string', returns: 'void' })
            notify(s: string) { this.last = s; }
            @method({ returns: 'string' })
            getLast(): string { return this.last ?? ''; }
        }

        const loop = new LoopbackPair();
        // Bind both sides
        const unsubServer = bindService(ServerAPI, loop.a);
        const unsubClient = bindService(ClientAPI, loop.b);

        // Client -> Server
        const server = createProxyFromService(ServerAPI, loop.b);
        expect(await server.echo('hey')).toBe('hey!');

        // Server -> Client (server side uses its transport end 'a')
        const client = createProxyFromService(ClientAPI, loop.a);
        await client.notify('from-server');

        // Verify client state by calling client method from the server side
        const client2 = createProxyFromService(ClientAPI, loop.a);
        expect(await client2.getLast()).toBe('from-server');

        unsubServer();
        unsubClient();
    });

    it('syncedField get/set/watch roundtrip', async () => {
        @service()
        class Counter {
            @syncedField('u32')
            value = 0;
        }
        const loop = new LoopbackPair();
        const unsub = bindService(Counter, loop.a, new Counter());
        const client = createProxyFromService(Counter, loop.b);
        // initial get
        expect(await client.value.get()).toBe(0);
        // set and get
        await client.value.set(5);
        expect(await client.value.get()).toBe(5);
        // watch stream emits current then updates
        const seen: number[] = [];
        const it = client.value.watch();
        const reader = (async () => { for await (const v of it) { seen.push(v); if (seen.length >= 3) break; } })();
        await client.value.set(6);
        await client.value.set(7);
        await reader;
        expect(seen[0]).toBe(5); // current at time of watch
        expect(seen.slice(1)).toEqual([6, 7]);
        unsub();
    });

    it('syncedField property assignment and subscribe/unsubscribe', async () => {
        @service()
        class Counter {
            @syncedField('u32')
            value = 0;
        }
        const loop = new LoopbackPair();
        const unsub = bindService(Counter, loop.a, new Counter());
        const client = createProxyFromService(Counter, loop.b) as any;

        const seen: number[] = [];
        const off = client.value.subscribe((v: number) => { seen.push(v); });
        // allow initial current value to arrive
        await new Promise((r) => setTimeout(r, 0));
        // assign like a normal property
        (client as any).value = 5;
        await new Promise((r) => setTimeout(r, 0));
        expect(seen.slice(0, 2)).toEqual([0, 5]);

        // unsubscribe and verify no further notifications
        off();
        (client as any).value = 9;
        await new Promise((r) => setTimeout(r, 0));
        expect(seen.includes(9)).toBe(false);

        // still reflects server state
        expect(await client.value.get()).toBe(9);
        unsub();
    });
});
