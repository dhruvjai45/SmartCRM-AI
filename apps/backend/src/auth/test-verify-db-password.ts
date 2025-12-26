// apps/backend/src/auth/test-verify-db-password.ts
import pool from '../db/pool';
import { verifyPassword } from './password';

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: npx ts-node src/auth/test-verify-db-password.ts <email> <password>');
    process.exit(1);
  }
  const [email, password] = args;

  try {
    const { rows } = await pool.query(
      `SELECT id, email, password_hash FROM smartcrm.users WHERE lower(email) = lower($1) LIMIT 1`,
      [email]
    );
    if (rows.length === 0) {
      console.error('No user found for', email);
      process.exit(2);
    }
    const user = rows[0];
    console.log('User id:', user.id);
    console.log('Stored hash:', user.password_hash);

    try {
      const ok = await verifyPassword(user.password_hash, password);
      console.log('verifyPassword result:', ok);
      process.exit(ok ? 0 : 3);
    } catch (verifyErr: any) {
      console.error('verifyPassword threw error:', verifyErr?.message ?? verifyErr);
      process.exit(4);
    }
  } catch (err: any) {
    console.error('DB query failed:', err?.message ?? err);
    process.exit(5);
  }
}

run();