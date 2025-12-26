// apps/backend/src/services/authToken.service.ts
import pool from '../db/pool';
import { hashTokenSha256 } from '../auth/tokenHash';

export async function storeRefreshToken(refreshToken: string, userId: string, expiresAtIso: string) {
  const hash = hashTokenSha256(refreshToken);
  const q = `INSERT INTO smartcrm.auth_refresh_tokens (user_id, refresh_token_hash, issued_at, expires_at)
             VALUES ($1, $2, now(), $3)`;
  await pool.query(q, [userId, hash, expiresAtIso]);
}

export async function revokeRefreshTokenHash(refreshTokenHash: string) {
  const q = `UPDATE smartcrm.auth_refresh_tokens SET revoked_at = now() WHERE refresh_token_hash = $1 AND revoked_at IS NULL`;
  await pool.query(q, [refreshTokenHash]);
}

export async function isRefreshTokenValid(refreshToken: string) {
  const hash = hashTokenSha256(refreshToken);
  const q = `SELECT id, user_id, expires_at, revoked_at FROM smartcrm.auth_refresh_tokens WHERE refresh_token_hash = $1`;
  const r = await pool.query(q, [hash]);
  if (r.rowCount === 0) return false;
  const row = r.rows[0];
  if (row.revoked_at) return false;
  if (new Date(row.expires_at) < new Date()) return false;
  return { id: row.id, userId: row.user_id };
}