import { createBackendRuntime } from "./composition.ts";
import { loadBackendConfig } from "./config.ts";

const config = loadBackendConfig(process.env);
const runtime = createBackendRuntime(config);
let server: ReturnType<typeof Bun.serve>;

try {
  server = Bun.serve({ port: config.port, hostname: config.host, fetch: runtime.app.fetch });
  console.log(`Server running at http://${config.host}:${config.port}`);
} catch (error: unknown) {
  runtime.close();
  console.error("Failed to start server", { causeName: error instanceof Error ? error.name : "UnknownError" });
  process.exit(1);
}

/** Stop the HTTP server and close owned resources for a process signal. */
async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down gracefully...`);
  await server.stop();
  runtime.close();
  console.log("Server closed successfully");
  process.exit(0);
}

process.on("SIGINT", () => { void shutdown("SIGINT"); });
process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
