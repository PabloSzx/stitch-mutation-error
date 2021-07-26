import Fastify from "fastify";

import { CreateApp, gql } from "@graphql-ez/fastify";
import { ezSchema } from "@graphql-ez/plugin-schema";
import { resolve } from "path";
import { ezAltairIDE } from "@graphql-ez/plugin-altair";
import { ezCodegen } from "@graphql-ez/plugin-codegen";

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
          `,
          resolvers: {
            Query: {
              hello() {
                return "hello";
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

app.listen(3001);
