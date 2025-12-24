// src/config/env.ts
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') }); // loads repo-level .env

function required(name: string, v?: string | undefined): string {
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  app: {
    host: process.env.APP_HOST ?? '0.0.0.0',
    port: Number(process.env.APP_PORT ?? 4000),
    mode: process.env.NODE_ENV ?? 'development',
  },
  db: {
    host: required('DATABASE_HOST', process.env.DATABASE_HOST),
    port: Number(process.env.DATABASE_PORT ?? 5433),
    user: required('DATABASE_USER', process.env.DATABASE_USER),
    password: required('DATABASE_PASSWORD', process.env.DATABASE_PASSWORD),
    database: required('DATABASE_NAME', process.env.DATABASE_NAME),
  },
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? ''
  },
  security: {
    jwtSecret: process.env.JWT_SECRET ?? '',
    refreshKey: process.env.REFRESH_TOKEN_KEY ?? '',
    encryptionKey: process.env.ENCRYPTION_KEY ?? ''
  }
};

export type Config = typeof config;