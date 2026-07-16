import { getDb } from './db';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  username: string;
  password_hash: string | null;
  email_verified: number;
  created_at: string;
}

export interface SeriesDay {
  day: number;
  title: string;
  ref: string;
  verse: string;
  move: string;
  reading: { context: string; closeRead: string; scholars: string; forYou: string } | null;
}

export interface SeriesRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  passage: string | null;
  total_days: number;
  days_json: string;
}

export interface ProgressRow {
  id: string;
  user_id: string;
  series_id: string;
  current_day: number;
  completed_days: string;
  last_read_at: string | null;
}

const uuid = () => crypto.randomUUID();

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const db = getDb();
  const row = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first<UserRow>();
  return row ?? null;
}

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  const db = getDb();
  const row = await db.prepare('SELECT * FROM users WHERE username = ?').bind(username.toLowerCase()).first<UserRow>();
  return row ?? null;
}

export async function findUserByLoginId(idOrEmail: string): Promise<UserRow | null> {
  const db = getDb();
  const row = await db
    .prepare('SELECT * FROM users WHERE username = ?1 OR email = ?1')
    .bind(idOrEmail.toLowerCase())
    .first<UserRow>();
  return row ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const db = getDb();
  const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
  return row ?? null;
}

export async function createUserWithPassword(opts: {
  name: string;
  email: string;
  username: string;
  passwordHash: string;
}): Promise<UserRow> {
  const db = getDb();
  const id = uuid();
  await db.batch([
    db
      .prepare('INSERT INTO users (id, name, email, username, password_hash) VALUES (?, ?, ?, ?, ?)')
      .bind(id, opts.name, opts.email.toLowerCase(), opts.username.toLowerCase(), opts.passwordHash),
    db.prepare('INSERT INTO auth_identities (id, user_id, provider) VALUES (?, ?, ?)').bind(uuid(), id, 'password'),
  ]);
  return (await findUserById(id))!;
}

export async function findUserByGoogleSub(sub: string): Promise<UserRow | null> {
  const db = getDb();
  const row = await db
    .prepare(
      `SELECT u.* FROM users u
       JOIN auth_identities a ON a.user_id = u.id
       WHERE a.provider = 'google' AND a.provider_uid = ?`
    )
    .bind(sub)
    .first<UserRow>();
  return row ?? null;
}

export async function findOrCreateGoogleUser(profile: {
  sub: string;
  email: string;
  name: string;
  emailVerified: boolean;
}): Promise<UserRow> {
  const existing = await findUserByGoogleSub(profile.sub);
  if (existing) return existing;

  const db = getDb();

  // If someone already signed up with this email via password, link the account.
  const byEmail = await findUserByEmail(profile.email);
  if (byEmail) {
    await db
      .prepare('INSERT INTO auth_identities (id, user_id, provider, provider_uid) VALUES (?, ?, ?, ?)')
      .bind(uuid(), byEmail.id, 'google', profile.sub)
      .run();
    return byEmail;
  }

  const id = uuid();
  const baseUsername = profile.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '') || 'reader';
  let username = baseUsername;
  let suffix = 1;
  while (await findUserByUsername(username)) {
    username = `${baseUsername}${suffix++}`;
  }

  await db.batch([
    db
      .prepare(
        'INSERT INTO users (id, name, email, username, password_hash, email_verified) VALUES (?, ?, ?, ?, NULL, ?)'
      )
      .bind(id, profile.name || baseUsername, profile.email.toLowerCase(), username, profile.emailVerified ? 1 : 0),
    db
      .prepare('INSERT INTO auth_identities (id, user_id, provider, provider_uid) VALUES (?, ?, ?, ?)')
      .bind(uuid(), id, 'google', profile.sub),
  ]);
  return (await findUserById(id))!;
}

export async function getDefaultSeries(): Promise<SeriesRow | null> {
  const db = getDb();
  const row = await db.prepare('SELECT * FROM series ORDER BY created_at ASC LIMIT 1').first<SeriesRow>();
  return row ?? null;
}

export async function getSeriesById(id: string): Promise<SeriesRow | null> {
  const db = getDb();
  const row = await db.prepare('SELECT * FROM series WHERE id = ?').bind(id).first<SeriesRow>();
  return row ?? null;
}

export async function getOrCreateProgress(userId: string, seriesId: string): Promise<ProgressRow> {
  const db = getDb();
  const existing = await db
    .prepare('SELECT * FROM progress WHERE user_id = ? AND series_id = ?')
    .bind(userId, seriesId)
    .first<ProgressRow>();
  if (existing) return existing;

  const id = uuid();
  await db
    .prepare('INSERT INTO progress (id, user_id, series_id, current_day, completed_days) VALUES (?, ?, ?, 1, ?)')
    .bind(id, userId, seriesId, '[]')
    .run();
  return (await db.prepare('SELECT * FROM progress WHERE id = ?').bind(id).first<ProgressRow>())!;
}

export async function listSeries(): Promise<SeriesRow[]> {
  const db = getDb();
  const { results } = await db.prepare('SELECT * FROM series ORDER BY created_at ASC').all<SeriesRow>();
  return results ?? [];
}

export async function updateSeries(
  id: string,
  fields: { title?: string; subtitle?: string | null; passage?: string | null; days_json?: string; total_days?: number }
): Promise<SeriesRow | null> {
  const db = getDb();
  const current = await getSeriesById(id);
  if (!current) return null;

  const defined = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
  const next = { ...current, ...defined };
  await db
    .prepare('UPDATE series SET title = ?, subtitle = ?, passage = ?, days_json = ?, total_days = ? WHERE id = ?')
    .bind(next.title, next.subtitle, next.passage, next.days_json, next.total_days, id)
    .run();
  return getSeriesById(id);
}

export interface SiteContentRow {
  key: string;
  value: string;
  updated_at: string;
}

export async function getSiteContentMap(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const db = getDb();
  const placeholders = keys.map(() => '?').join(', ');
  const { results } = await db
    .prepare(`SELECT key, value FROM site_content WHERE key IN (${placeholders})`)
    .bind(...keys)
    .all<SiteContentRow>();
  const map: Record<string, string> = {};
  for (const row of results ?? []) map[row.key] = row.value;
  return map;
}

export async function upsertSiteContent(key: string, value: string): Promise<void> {
  const db = getDb();
  await db
    .prepare(
      `INSERT INTO site_content (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
    )
    .bind(key, value)
    .run();
}

export async function deleteSiteContent(key: string): Promise<void> {
  const db = getDb();
  await db.prepare('DELETE FROM site_content WHERE key = ?').bind(key).run();
}

export async function completeDay(userId: string, seriesId: string, day: number, totalDays: number): Promise<ProgressRow> {
  const db = getDb();
  const progress = await getOrCreateProgress(userId, seriesId);
  const completed: number[] = JSON.parse(progress.completed_days);
  if (!completed.includes(day)) completed.push(day);
  const nextDay = Math.min(totalDays + 1, Math.max(progress.current_day, day + 1));

  await db
    .prepare(
      "UPDATE progress SET completed_days = ?, current_day = ?, last_read_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
    )
    .bind(JSON.stringify(completed), nextDay, progress.id)
    .run();

  return (await db.prepare('SELECT * FROM progress WHERE id = ?').bind(progress.id).first<ProgressRow>())!;
}
