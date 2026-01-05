// src/services/users.service.ts
import pool from '../db/pool';

export type UserRole = 'admin' | 'manager' | 'sales';

export async function listCompanyUsers(companyId: string) {
  const { rows } = await pool.query(
    `
    SELECT
      id,
      email,
      name,
      role,
      is_active,
      last_login_at,
      created_at
    FROM smartcrm.users
    WHERE company_id = $1
    ORDER BY created_at ASC
    `,
    [companyId]
  );

  return rows;
}

export async function updateUserRole(
  companyId: string,
  targetUserId: string,
  newRole: UserRole,
  actingUserId: string
) {
  if (targetUserId === actingUserId) {
    throw new Error('You cannot change your own role');
  }

  const result = await pool.query(
    `
    UPDATE smartcrm.users
    SET role = $1, updated_at = now()
    WHERE id = $2 AND company_id = $3
    `,
    [newRole, targetUserId, companyId]
  );

  if (result.rowCount === 0) {
    throw new Error('User not found');
  }

  return true;
}

export async function setUserActiveStatus(
  companyId: string,
  targetUserId: string,
  isActive: boolean,
  actingUserId: string
) {
  if (targetUserId === actingUserId) {
    throw new Error('You cannot deactivate yourself');
  }

  const result = await pool.query(
    `
    UPDATE smartcrm.users
    SET is_active = $1, updated_at = now()
    WHERE id = $2 AND company_id = $3
    `,
    [isActive, targetUserId, companyId]
  );

  if (result.rowCount === 0) {
    throw new Error('User not found');
  }

  return true;
}