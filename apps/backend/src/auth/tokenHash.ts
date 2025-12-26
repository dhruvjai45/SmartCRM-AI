// apps/backend/src/auth/tokenHash.ts
import crypto from 'crypto';

export function hashTokenSha256(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}