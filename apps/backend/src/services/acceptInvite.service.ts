import pool from '../db/pool';
import { hashPassword } from '../auth/password';
import crypto from 'crypto';

function hashInviteToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}


export async function acceptInvitation(
  token: string,
  name: string,
  password: string
) {
  const tokenHash = hashInviteToken(token);


  const inviteRes = await pool.query(
    `
    SELECT *
    FROM smartcrm.invitations
    WHERE token_hash = $1
      AND status = 'pending'
      AND expires_at > now()
    `,
    [tokenHash]
  );

  if (inviteRes.rowCount === 0) {
    throw new Error('Invalid or expired invitation');
  }

  const invite = inviteRes.rows[0];

  const existingUser = await pool.query(
    `
    SELECT id
    FROM smartcrm.users
    WHERE company_id = $1 AND lower(email) = lower($2)
    `,
    [invite.company_id, invite.email]
  );

  if ((existingUser.rowCount ?? 0) > 0) {
    throw new Error('User already exists');
  }

  const passwordHash = await hashPassword(password);

  const userRes = await pool.query(
    `
    INSERT INTO smartcrm.users
      (company_id, email, name, role, password_hash)
    VALUES
      ($1, $2, $3, $4, $5)
    RETURNING id, email, name, role
    `,
    [
      invite.company_id,
      invite.email,
      name,
      invite.role,
      passwordHash
    ]
  );

  const user = userRes.rows[0];

  await pool.query(
    `
    UPDATE smartcrm.invitations
    SET
      status = 'accepted',
      accepted_at = now(),
      accepted_by = $1
    WHERE id = $2
    `,
    [user.id, invite.id]
  );

  return {
    user,
    companyId: invite.company_id
  };
}