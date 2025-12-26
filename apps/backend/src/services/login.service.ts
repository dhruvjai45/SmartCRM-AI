import pool from '../db/pool';
import { verifyPassword } from '../auth/password';
import { signAccessToken, signRefreshToken } from '../auth/jwt';
import { storeRefreshToken } from './authToken.service';

const REFRESH_TTL_DAYS = 30;

export async function loginService(email: string, password: string) {
  const { rows } = await pool.query(
    `
    SELECT id, email, name, role, password_hash, company_id
    FROM smartcrm.users
    WHERE lower(email) = lower($1)
    `,
    [email]
  );

  const user = rows[0];
  if (!user) throw new Error('Invalid credentials');

  const valid = await verifyPassword(user.password_hash, password);
  if (!valid) throw new Error('Invalid credentials');

  const accessToken = signAccessToken({
    userId: user.id,
    companyId: user.company_id,
    role: user.role
  });

  const refreshToken = signRefreshToken({
    userId: user.id,
    companyId: user.company_id,
    role: user.role
  });

  const expiresAt = new Date(
    Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await storeRefreshToken(refreshToken, user.id, expiresAt);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.company_id
    }
  };
}
