import Fastify from "fastify";
import { resolve } from "path";

import { CreateApp, gql } from "@graphql-ez/fastify";
import { ezAltairIDE } from "@graphql-ez/plugin-altair";
import { ezCodegen } from "@graphql-ez/plugin-codegen";
import { ezSchema } from "@graphql-ez/plugin-schema";

const app = Fastify({
  logger: true,
});

const { buildApp } = CreateApp({
  ez: {
    plugins: [
      ezSchema({
        schema: {
          typeDefs: gql`
            type Query {
              hello: String!
            }

            type FooMutations {
              c: String!
            }

            type Mutation {
              foo: FooMutations!
            }
          `,
          resolvers: {
            Query: {
              hello() {
                return "hello";
              },
            },
            FooMutations: {
              c() {
                return "c";
              },
            },
            Mutation: {
              foo() {
                return {};
              },
            },
          },
        },
      }),
      ezAltairIDE(),
      ezCodegen({
        outputSchema: resolve(__dirname, "../schema.gql"),
        config: {
          deepPartialResolvers: true,
          enumsAsTypes: true,
        },
      }),
    ],
  },
});

app.register(buildApp().fastifyPlugin);

app.listen(3003);
