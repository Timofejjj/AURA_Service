import { defineConfig } from 'orval';

export default defineConfig({
    aura: {
        output: {
            mode: 'tags-split',
            target: 'api/generated',
            schemas: 'api/model',
            client: 'react-query',
            override: {
                mutator: {
                    path: 'lib/axios-instance.ts',
                    name: 'customInstance',
                },
            },
        },
        input: {
            target: '../backend/docs/swagger.yaml',
        },
    },
});