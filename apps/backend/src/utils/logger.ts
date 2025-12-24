// src/utils/logger.ts
export const log = {
  info: (...args: unknown[]) => console.log('[info]', ...args),
  error: (...args: unknown[]) => console.error('[error]', ...args),
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') console.debug('[debug]', ...args);
  }
};