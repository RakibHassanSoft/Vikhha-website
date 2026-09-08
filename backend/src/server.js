import { env, assertEnv } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';

async function main() {
  assertEnv();
  await connectDB();

  const app = createApp();
  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[api] listening on :${env.port} (${env.nodeEnv})`);
    // eslint-disable-next-line no-console
    console.log(`[api] base url -> http://localhost:${env.port}${env.apiPrefix}`);
  });

  const shutdown = (signal) => async () => {
    // eslint-disable-next-line no-console
    console.log(`\n[api] ${signal} received, shutting down…`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', shutdown('SIGTERM'));
  process.on('SIGINT', shutdown('SIGINT'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[api] failed to start:', err);
  process.exit(1);
});
