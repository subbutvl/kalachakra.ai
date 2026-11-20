/** Typed settings. Phase 1 runs on this computer only: the API listens on localhost. */
export interface Env {
  host: string;
  port: number;
  /** The one origin allowed by CORS: our own web app. */
  webOrigin: string;
}

export function readEnv(source: Record<string, string | undefined> = process.env): Env {
  const port = Number(source.API_PORT ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`API_PORT must be a port number, got ${source.API_PORT}`);
  }
  return {
    host: source.API_HOST ?? "127.0.0.1",
    port,
    webOrigin: source.WEB_ORIGIN ?? "http://localhost:3000",
  };
}
