import { parse } from "content-type";
import Fastify from "fastify";
import { print } from "graphql";
import ms from "ms";
import { resolve } from "path";
import { request } from "undici";
import waitOn from "wait-on";

import { CreateApp, EZContext } from "@graphql-ez/fastify";
import { ezAltairIDE } from "@graphql-ez/plugin-altair";
import { ezCodegen } from "@graphql-ez/plugin-codegen";
import { stitchSchemas } from "@graphql-tools/stitch";
import { introspectSchema } from "@graphql-tools/wrap";

import { servicesListPorts } from "../../../services";

import type { AsyncExecutor, SubschemaConfig } from "@graphql-tools/delegate";

type ServiceName = keyof typeof servicesListPorts;

const app = Fastify({
  logger: true,
});

function getStreamJSON<T>(stream: import("stream").Readable, encoding: BufferEncoding) {
  return new Promise<T>((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    stream.on("data", (chunk) => {
      chunks.push(chunk);
    });

    stream.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString(encoding || "utf-8")));
      } catch (err) {
        reject(err);
      }
    });
  });
}

const servicesSubschemaConfig: {
  [k in ServiceName]?: Partial<SubschemaConfig>;
} = {};

async function getServiceSchema([name, port]: [name: string, port: number]) {
  const remoteExecutor: AsyncExecutor<Partial<EZContext>> = async function remoteExecutor({
    document,
    variables,
    context,
  }) {
    const query = print(document);

    if (query === "mutation\n") throw Error("Error in gateway");

    const authorization = context?.request?.headers.authorization;

    const { body, headers } = await request(`http://localhost:${port}/graphql`, {
      body: JSON.stringify({ query, variables }),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization,
      },
    });

    if (!headers["content-type"]) throw Error("No content-type specified!");

    const { type, parameters } = parse(headers["content-type"]);

    if (type === "application/json")
      return getStreamJSON(body, (parameters["charset"] as BufferEncoding) || "utf-8");

    throw Error("Unexpected content-type, expected 'application/json', received: " + type);
  };

  const serviceSubschema: SubschemaConfig = {
    schema: await introspectSchema(remoteExecutor),
    executor: remoteExecutor,
    ...servicesSubschemaConfig[name as ServiceName],
    // subscriber: remoteSubscriber
  };

  return serviceSubschema;
}

async function main() {
  const services = Object.entries(servicesListPorts);

  await waitOn({
    resources: services.map(([, port]) => `tcp:${port}`),
    timeout: ms("30 seconds"),
  });

  const schema = stitchSchemas({
    subschemas: await Promise.all(services.map(getServiceSchema)),
  });

  const { buildApp } = CreateApp({
    schema,
    ez: {
      plugins: [
        ezCodegen({
          outputSchema: resolve(__dirname, "../../schema.gql"),
          config: {
            deepPartialResolvers: true,
            enumsAsTypes: true,
          },
        }),
        ezAltairIDE({}),
      ],
    },
    cors: true,
  });

  app.register(buildApp().fastifyPlugin);

  app.listen(3000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});