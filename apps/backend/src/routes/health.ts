// src/routes/health.ts
import { Router } from 'express';
import { testDb } from '../db/pool';
import { config } from '../config/env';

const router = Router();

router.get('/', async (req, res) => {
  const timestamp = new Date().toISOString();
  let db = { ok: false };
  try {
    const ok = await testDb();
    db.ok = ok;
  } catch (err) {
    db.ok = false;
    // connection error included below
    (db as any).error = (err as Error).message;
  }

  res.json({
    status: 'ok',
    timestamp,
    app: {
      host: config.app.host,
      port: config.app.port,
      mode: config.app.mode
    },
    db
  });
});

export default router;