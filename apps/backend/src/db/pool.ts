// src/db/pool.ts
import { Pool } from 'pg';
import { config } from '../config/env';

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: 10
});

export async function testDb() {
  const res = await pool.query('SELECT 1');
  return res.rowCount === 1;
}

export default pool;