import { field, serialize, deserialize } from '../src/index.js'
import B from 'benchmark'
import protobuf from "protobufjs";
import crypto from 'crypto';

// Run with "node --loader ts-node/esm ./benchmark/string.ts"

/*** 
 * 
---- String length: 8 ----
json x 2,537,049 ops/sec ±0.27% (101 runs sampled)
borsh x 4,324,589 ops/sec ±0.43% (295 runs sampled)
protobujs x 4,184,944 ops/sec ±0.72% (292 runs sampled)
Fastest is borsh
---- String length: 32 ----
json x 2,071,172 ops/sec ±3.28% (98 runs sampled)
borsh x 3,339,494 ops/sec ±0.55% (293 runs sampled)
protobujs x 3,169,088 ops/sec ±0.56% (294 runs sampled)
Fastest is borsh
---- String length: 128 ----
json x 1,350,306 ops/sec ±0.28% (102 runs sampled)
borsh x 2,430,639 ops/sec ±0.43% (292 runs sampled)
protobujs x 2,435,772 ops/sec ±0.65% (291 runs sampled)
Fastest is borsh,protobujs
---- String length: 512 ----
json x 528,413 ops/sec ±1.36% (99 runs sampled)
borsh x 1,572,675 ops/sec ±0.45% (295 runs sampled)
protobujs x 1,562,367 ops/sec ±0.49% (286 runs sampled)
Fastest is borsh
---- String length: 20000 ----
json x 18,728 ops/sec ±0.14% (105 runs sampled)
borsh x 94,758 ops/sec ±0.43% (292 runs sampled)
protobujs x 95,450 ops/sec ±0.47% (292 runs sampled)

 */
function getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
}


class Test {

    @field({ type: 'string' })
    name: string;

    constructor(name: string,) {
        this.name = name;
    }
}

const protoRoot = protobuf.loadSync('benchmark/string.proto')
const ProtoMessage = protoRoot.lookupType("Message");
let sizes = [4, 16, 64, 256, 10000]
for (const size of sizes) {
    const createObject = () => {
        return new Test(crypto.randomBytes(size).toString('hex'))
    }
    console.log("---- String length: " + createObject().name.length + " ----");
    const numTestObjects = 10000
    const testObjects = ((new Array(numTestObjects)).fill(createObject()));
    const getTestObject = () => testObjects[getRandomInt(numTestObjects)];
    const borshArgs = { unchecked: true, object: true }
    const suite = new B.Suite()
    suite.add("json", () => {
        JSON.parse(JSON.stringify(getTestObject()))
    }, { minSamples: 10 }).add("___ warmup ___ ", () => {
        deserialize(serialize(getTestObject()), Test, borshArgs)
        ProtoMessage.toObject(ProtoMessage.decode(ProtoMessage.encode(getTestObject()).finish()))
    }, { minSamples: 10 }).add("borsh", () => {
        deserialize(serialize(getTestObject()), Test, borshArgs)
    }, { minSamples: 200 }).add('protobujs', () => {
        ProtoMessage.toObject(ProtoMessage.decode(ProtoMessage.encode(getTestObject()).finish()))
    }, { minSamples: 200 }).on('cycle', (event: any) => {
        console.log(String(event.target));
    }).on('complete', function () {
        console.log("Fastest is " + this.filter('fastest').map('name'));
    }).run()
}
