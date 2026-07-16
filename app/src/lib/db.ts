import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface Env {
  DB: D1Database;
  SESSION_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
}

export function getEnv(): Env {
  const { env } = getCloudflareContext();
  return env as unknown as Env;
}

export function getDb(): D1Database {
  return getEnv().DB;
}
