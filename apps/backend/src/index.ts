// src/index.ts
import { createApp } from './app';
import { config } from './config/env';
import { log } from './utils/logger';
import pool from './db/pool';

const app = createApp();

app.listen(config.app.port, config.app.host, () => {
  log.info(`SmartCRM backend running at http://${config.app.host}:${config.app.port}`);
  // optional quick DB test at startup
  pool.query('SELECT 1').then(() => log.info('DB connected')).catch((err: unknown) => {
    if (err instanceof Error) {
      log.error('DB connection failed', err.message);
    } else {
      log.error('DB connection failed', err);
    }
  });
});
