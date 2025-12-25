import { createApp } from './app';
import { config } from './config/env';
import { log } from './utils/logger';
import pool from './db/pool';

const app = createApp();

const server = app.listen(config.app.port, config.app.host, () => {
  log.info(`SmartCRM backend running at http://${config.app.host}:${config.app.port}`);
  pool.query('SELECT 1')
    .then(() => log.info('DB connected'))
    .catch((err) => log.error('DB connection failed', err));
});

async function shutdown(signal: string) {
  log.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    log.info('HTTP server closed');

    try {
      await pool.end();
      log.info('Database connections closed');

      process.exit(0);
    } catch (err) {
      log.error('Error during shutdown', err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    log.error('Shutdown timeout reached. Forcing exit.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGQUIT', shutdown);