import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { readEnv } from "./env.js";
import { warmUpPdf } from "@kalachakra/report/pdf";

const env = readEnv();
const app = createApp(env);

const server = serve({ fetch: app.fetch, hostname: env.host, port: env.port }, (info) => {
  console.log(
    `KalaChakra API on http://${env.host === "127.0.0.1" ? "localhost" : info.address}:${info.port}`,
  );
  console.log(`Interactive docs: http://localhost:${info.port}/docs`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${env.port} is already in use, probably by another copy of the API that is still running.\n` +
        `Close that terminal, or stop it with:\n` +
        `  Get-NetTCPConnection -LocalPort ${env.port} -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess }\n` +
        `Or run on another port: $env:API_PORT=8788; pnpm dev`,
    );
    process.exit(1);
  }
  throw err;
});

// Start the PDF browser in the background so the first report download is quick.
warmUpPdf().catch((e: unknown) => {
  console.warn(`PDF browser not ready: ${e instanceof Error ? e.message : String(e)}`);
});
