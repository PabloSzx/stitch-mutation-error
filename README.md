# Reproduction of mutation gateway issue with @graphql-tools/stitch

1. Clone repository
2. Install dependencies with `pnpm i`
3. Start all the services with the gateway writing `pnpm start` in the root

An Altair instance will open with the issue, if you press "run mutation a", or "run mutation b", a document generated for the incorrect service target and is filtered with basically nothing, only `mutation`.

Gateway code: [/services/gateway/src/index.ts](/services/gateway/src/index.ts)

![Error Screenshot](https://i.imgur.com/9ldliFI.png)

![Schema](https://i.imgur.com/aREi68R.png)

- fooMutations.a points to service "a", localhost:3001
- fooMutations.b points to service "b", localhost:3002
- fooMutations.c points to service "c", localhost:3003