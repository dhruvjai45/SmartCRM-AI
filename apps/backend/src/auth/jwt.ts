import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export type TokenType = 'access' | 'refresh';

export interface JwtPayloadInternal {
  sub: string;        
  cid: string;
  role: string;
  type: TokenType;
}

const ACCESS_TTL = '15m';
const REFRESH_TTL = '30d';
const ISSUER = 'smartcrm';

export function signAccessToken(identity: {
  userId: string;
  companyId: string;
  role: string;
}): string {
  return jwt.sign(
    {
      sub: identity.userId,
      cid: identity.companyId,
      role: identity.role,
      type: 'access'
    },
    config.security.jwtSecret,
    {
      expiresIn: ACCESS_TTL,
      issuer: ISSUER
    }
  );
}

export function signRefreshToken(identity: {
  userId: string;
  companyId: string;
  role: string;
}): string {
  return jwt.sign(
    {
      sub: identity.userId,
      cid: identity.companyId,
      role: identity.role,
      type: 'refresh'
    },
    config.security.refreshKey,
    {
      expiresIn: REFRESH_TTL,
      issuer: ISSUER
    }
  );
}

export function verifyAccessToken(token: string): JwtPayloadInternal {
  return jwt.verify(
    token,
    config.security.jwtSecret,
    { issuer: ISSUER }
  ) as JwtPayloadInternal;
}

export function verifyRefreshToken(token: string): JwtPayloadInternal {
  return jwt.verify(
    token,
    config.security.refreshKey,
    { issuer: ISSUER }
  ) as JwtPayloadInternal;
}