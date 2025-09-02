import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/**/*.vitest.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
        environment: 'node',
        globals: true,
    },
});
