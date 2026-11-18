import { app } from './app.js';
import { env } from './config/env.js';
import { checkDatabase, pool } from './database/pool.js';

await checkDatabase();
const server = app.listen(env.API_PORT, env.API_HOST, () => {
  console.log(`Travneeds API listening on http://${env.API_HOST}:${env.API_PORT}`);
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
