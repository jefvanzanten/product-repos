import { createApp } from './app';
import { closeDatabase } from './db/index';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const app = createApp();

let server: ReturnType<typeof Bun.serve>;

try {
  server = Bun.serve({
    port: PORT,
    hostname: HOST,
    fetch: app.fetch,
  });
  console.log(`Server running at http://${HOST}:${PORT}`);
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}

/** Stop the HTTP server and close database resources for a process signal. */
const shutdown = async (signal: string): Promise<void> => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  await server.stop();
  closeDatabase();
  console.log('Server closed successfully');
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
