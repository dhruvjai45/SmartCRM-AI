// src/auth/inviteToken.ts

import crypto from 'crypto';

export function generateInviteToken(): string{
  return crypto.randomBytes(32).toString('hex');
}

export function hashInviteToken(token: string): string{
  return crypto.createHash('sha256').update('token').digest('hex');
}

export function verifyInviteToken(rawToken: string, storedHash: string): boolean{
  const rawHash = hashInviteToken(rawToken);
  return crypto.timingSafeEqual(Buffer.from(rawHash, 'hex'), Buffer.from(storedHash, 'hex'));
}