// apps/backend/src/config/env.ts
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

function required(name: string, v?: string): string {
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  app: {
    host: process.env.APP_HOST ?? '0.0.0.0',
    port: Number(process.env.APP_PORT ?? 4000),
    mode: process.env.NODE_ENV ?? 'development',
  },

  frontend: {
    url: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  },

  db: {
    host: required('DATABASE_HOST', process.env.DATABASE_HOST),
    port: Number(process.env.DATABASE_PORT ?? 5433),
    user: required('DATABASE_USER', process.env.DATABASE_USER),
    password: required('DATABASE_PASSWORD', process.env.DATABASE_PASSWORD),
    database: required('DATABASE_NAME', process.env.DATABASE_NAME),
  },

  email: {
    address: required('EMAIL_ADDRESS', process.env.EMAIL_ADDRESS),
    password: required('EMAIL_PASSWORD', process.env.EMAIL_PASSWORD),
  },

  security: {
    jwtSecret: required('JWT_SECRET', process.env.JWT_SECRET),
    refreshKey: required('REFRESH_TOKEN_KEY', process.env.REFRESH_TOKEN_KEY),
    encryptionKey: required('ENCRYPTION_KEY', process.env.ENCRYPTION_KEY),
  }
};

export type Config = typeof config;