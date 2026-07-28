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

const shutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  void server.stop();
  closeDatabase();
  console.log('Server closed successfully');
  process.exit(0);
};

process.on('SIGINT', () => {
  shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
