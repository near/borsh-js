import { Schema } from '../types';
import * as borsh from '../../lib/esm/index';

type MyType = {
    value: string;
};

test('deserialize accepts a type cast', async () => {
    const data = { value: 'test' };

    const MyTypeSchema: Schema = {
        struct: {
            value: 'string'
        }
    };

    const serialized = borsh.serialize(MyTypeSchema, data);

    const deserialized = borsh.deserialize<MyType>(MyTypeSchema, serialized);
    expect(deserialized.value).toBe('test');

    const deserialized_2 = <MyType>borsh.deserialize(MyTypeSchema, serialized);
    expect(deserialized_2.value).toBe('test');
});