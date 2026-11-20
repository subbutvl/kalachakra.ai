import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { readEnv } from "./env.js";

const env = readEnv();
const app = createApp(env);

serve({ fetch: app.fetch, hostname: env.host, port: env.port }, (info) => {
  console.log(
    `KalaChakra API on http://${env.host === "127.0.0.1" ? "localhost" : info.address}:${info.port}`,
  );
  console.log(`Interactive docs: http://localhost:${info.port}/docs`);
});
