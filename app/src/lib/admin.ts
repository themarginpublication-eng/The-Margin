import { getEnv } from './db';
import { getCurrentUserId } from './auth';
import { findUserById, type UserRow } from './repo';

export function isAdminEmail(email: string): boolean {
  const list = getEnv().ADMIN_EMAILS || '';
  const allowed = list
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

/** Returns the signed-in user if they're an admin, otherwise null. */
export async function requireAdmin(): Promise<UserRow | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const user = await findUserById(userId);
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}
