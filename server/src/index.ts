import { app } from './app.js';
import { env } from './config/env.js';
import { checkDatabase, pool } from './database/pool.js';

await checkDatabase();
const port = env.PORT ?? env.API_PORT;
const server = app.listen(port, env.API_HOST, () => {
  console.log(`Travneeds listening on http://${env.API_HOST}:${port}`);
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
