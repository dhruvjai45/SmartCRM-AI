// apps/backend/src/routes/authLogout.ts
import { Router } from 'express';
import pool from '../db/pool';
import { verifyRefreshToken } from '../auth/jwt';
import { hashTokenSha256 } from '../auth/tokenHash';

const router = Router();

router.post('/', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

  try {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashTokenSha256(refreshToken);

    const q = `UPDATE smartcrm.auth_refresh_tokens
               SET revoked_at = now()
               WHERE refresh_token_hash = $1 AND revoked_at IS NULL
               RETURNING id, user_id, expires_at`;
    const r = await pool.query(q, [tokenHash]);

    if (r.rowCount === 0) {
      return res.json({ ok: true, revoked: false });
    }

    return res.json({ ok: true, revoked: true, token: r.rows[0] });
  } catch (err: any) {
    console.error('logout failed', err?.message ?? err);
    return res.status(200).json({ ok: false, error: 'Invalid or expired refresh token' });
  }
});

export default router;