import pool from '../db/pool';
import { hashPassword } from '../auth/password';

interface SignupPayload {
  email: string;
  password: string;
  name: string;
  companyName: string;
}

interface SignupResult {
  companyId: string;
  userId: string;
  trialEndsAt: Date;
}

export async function signupService(
  payload: SignupPayload
): Promise<SignupResult> {
  const { email, password, name, companyName } = payload;

  if (!email || !password || !companyName) {
    throw new Error('Missing required signup fields');
  }

  const passwordHash = await hashPassword(password);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const companyRes = await client.query(
      `
      INSERT INTO smartcrm.companies (
        name,
        trial_started_at,
        trial_ends_at,
        subscription_status
      )
      VALUES ($1, now(), now() + interval '30 days', 'trialing')
      RETURNING id, trial_ends_at
      `,
      [companyName]
    );

    const companyId = companyRes.rows[0].id;
    const trialEndsAt = companyRes.rows[0].trial_ends_at;

    const userRes = await client.query(
      `
      INSERT INTO smartcrm.users (
        company_id,
        email,
        name,
        role,
        password_hash
      )
      VALUES ($1, $2, $3, 'admin', $4)
      RETURNING id
      `,
      [companyId, email.toLowerCase(), name, passwordHash]
    );

    const userId = userRes.rows[0].id;

    await client.query('COMMIT');

    return { companyId, userId, trialEndsAt };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}