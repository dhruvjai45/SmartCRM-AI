import pool from '../db/pool';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '../auth/jwt';
import { hashTokenSha256 } from '../auth/tokenHash';

export async function rotateRefreshToken(oldRefreshToken: string) {
  const payload = verifyRefreshToken(oldRefreshToken);
  if (payload.type !== 'refresh') {
    throw new Error('Invalid refresh token');
  }

  const oldHash = hashTokenSha256(oldRefreshToken);

  const r = await pool.query(
    `
    SELECT id, user_id, expires_at, revoked_at
    FROM smartcrm.auth_refresh_tokens
    WHERE refresh_token_hash = $1
    `,
    [oldHash]
  );

  if (r.rowCount === 0) throw new Error('Invalid or expired refresh token');

  const row = r.rows[0];
  if (row.revoked_at) throw new Error('Refresh token revoked');
  if (new Date(row.expires_at) < new Date()) throw new Error('Refresh token expired');

  await pool.query(
    `
    UPDATE smartcrm.auth_refresh_tokens
    SET revoked_at = now()
    WHERE refresh_token_hash = $1
    `,
    [oldHash]
  );

  const accessToken = signAccessToken({
    userId: payload.sub,
    companyId: payload.cid,
    role: payload.role
  });

  const refreshToken = signRefreshToken({
    userId: payload.sub,
    companyId: payload.cid,
    role: payload.role
  });

  const newHash = hashTokenSha256(refreshToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await pool.query(
    `
    INSERT INTO smartcrm.auth_refresh_tokens (user_id, refresh_token_hash, issued_at, expires_at)
    VALUES ($1, $2, now(), $3)
    `,
    [payload.sub, newHash, expiresAt]
  );

  return {
    accessToken,
    refreshToken
  };
}