// src/app.ts
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes';
import { log } from './utils/logger';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));
  app.use(morgan('dev'));

  // mount api routes under /api
  app.use('/api', routes);

  app.get('/', (req, res) => {
    res.send('SmartCRM API (backend scaffold) — see /api/health');
  });

  // global error handler (simple)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, req: express.Request, res: express.Response, _next: any) => {
    log.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });

  return app;
}