// apps/backend/src/services/invite.service.ts
import pool from '../db/pool';
import { generateInviteToken, hashInviteToken } from '../auth/inviteToken';
import { sendInvitationEmail } from '../email/inviteEmail';

const INVITE_EXPIRY_DAYS = 7;

interface CreateInviteInput {
  companyId: string;
  invitedByUserId: string;
  email: string;
  role: 'admin' | 'manager' | 'sales';
}

export async function createInvitation(input: CreateInviteInput) {
  const { companyId, invitedByUserId, email, role } = input;

  const existingUser = await pool.query(
    `
    SELECT 1
    FROM smartcrm.users
    WHERE company_id = $1 AND lower(email) = lower($2)
    `,
    [companyId, email]
  );

  if (existingUser.rows.length > 0) {
    throw new Error('User with this email already exists in the company');
  }

  const companyRes = await pool.query(
    `
    SELECT name
    FROM smartcrm.companies
    WHERE id = $1
    `,
    [companyId]
  );

  if (companyRes.rowCount === 0) {
    throw new Error('Company not found');
  }

  const companyName = companyRes.rows[0].name;

  const rawToken = generateInviteToken();
  const tokenHash = hashInviteToken(rawToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  await pool.query(
    `
    INSERT INTO smartcrm.invitations (
      company_id,
      email,
      role,
      token_hash,
      sent_by_user_id,
      expires_at,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'pending')
    `,
    [
      companyId,
      email,
      role,
      tokenHash,
      invitedByUserId,
      expiresAt
    ]
  );

  sendInvitationEmail({
    to: email,
    companyName,
    role,
    inviteToken: rawToken
  }).catch(err => {
    console.error('[email] failed to send invitation:', err.message);
  });

  return {
    email,
    role,
    expiresAt,
    inviteToken: rawToken
  };
}
