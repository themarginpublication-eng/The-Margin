import { getDb } from './db';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  username: string;
  password_hash: string | null;
  email_verified: number;
  created_at: string;
  phone: string | null;
  notion_page_id: string | null;
  stripe_customer_id: string | null;
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
  created_at: string;
  access: 'gated' | 'open';
  free_days: number;
  kind: 'book' | 'person' | 'passage' | 'idea';
  status: 'live' | 'scheduled' | 'draft' | 'retired';
  sort_order: number;
  description: string | null;
}

export interface ProgressRow {
  id: string;
  user_id: string;
  series_id: string;
  current_day: number;
  completed_days: string;
  last_read_at: string | null;
  started_at: string | null;
  last_emailed_day: number;
  last_emailed_at: string | null;
  email_opt_out: number;
}

export interface EssayRow {
  id: string;
  slug: string;
  title: string;
  passage_ref: string | null;
  series_id: string | null;
  topic: string | null;
  summary: string | null;
  search_keywords: string | null;
  substack_url: string | null;
  status: 'draft' | 'published';
  body: string | null;
  passage_text: string | null;
  annotations_json: string;
  scheduled_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BroadcastRow {
  id: string;
  subject: string;
  body_html: string;
  recipient_filter: string;
  recipient_label: string;
  sent_count: number;
  failed_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  custom_emails: string | null;
  created_at: string;
}

export interface DonationRow {
  id: string;
  email: string;
  name: string | null;
  amount_cents: number;
  currency: string;
  frequency: 'one_time' | 'monthly';
  status: string;
  source: string;
  memo: string | null;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_subscription_id: string | null;
  stripe_invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateRow {
  key: string;
  subject: string | null;
  intro_html: string | null;
  updated_at: string;
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

export async function createSeries(title: string): Promise<SeriesRow> {
  const db = getDb();
  const id = uuid();
  const slug = await uniqueSlug(db, title);
  await db
    .prepare(`INSERT INTO series (id, slug, title, total_days, days_json, kind, status) VALUES (?, ?, ?, 0, '[]', 'idea', 'draft')`)
    .bind(id, slug, title)
    .run();
  return (await getSeriesById(id))!;
}

export async function updateSeries(
  id: string,
  fields: {
    title?: string;
    subtitle?: string | null;
    passage?: string | null;
    days_json?: string;
    total_days?: number;
    access?: 'gated' | 'open';
    free_days?: number;
    kind?: SeriesRow['kind'];
    status?: SeriesRow['status'];
    sort_order?: number;
    description?: string | null;
  }
): Promise<SeriesRow | null> {
  const db = getDb();
  const current = await getSeriesById(id);
  if (!current) return null;

  const defined = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
  const next = { ...current, ...defined };
  await db
    .prepare(
      `UPDATE series SET title = ?, subtitle = ?, passage = ?, days_json = ?, total_days = ?,
       access = ?, free_days = ?, kind = ?, status = ?, sort_order = ?, description = ? WHERE id = ?`
    )
    .bind(
      next.title,
      next.subtitle,
      next.passage,
      next.days_json,
      next.total_days,
      next.access,
      next.free_days,
      next.kind,
      next.status,
      next.sort_order,
      next.description,
      id
    )
    .run();
  return getSeriesById(id);
}

// --- Essays ---------------------------------------------------------------

export async function listEssays(): Promise<EssayRow[]> {
  const db = getDb();
  const { results } = await db.prepare('SELECT * FROM essays ORDER BY created_at DESC').all<EssayRow>();
  return results ?? [];
}

export async function getEssayById(id: string): Promise<EssayRow | null> {
  const db = getDb();
  const row = await db.prepare('SELECT * FROM essays WHERE id = ?').bind(id).first<EssayRow>();
  return row ?? null;
}

export async function createEssay(title: string, slug: string): Promise<EssayRow> {
  const db = getDb();
  const id = uuid();
  await db.prepare('INSERT INTO essays (id, slug, title) VALUES (?, ?, ?)').bind(id, slug, title).run();
  return (await getEssayById(id))!;
}

export async function updateEssay(
  id: string,
  fields: Partial<
    Pick<
      EssayRow,
      | 'title'
      | 'slug'
      | 'passage_ref'
      | 'series_id'
      | 'topic'
      | 'summary'
      | 'search_keywords'
      | 'substack_url'
      | 'status'
      | 'body'
      | 'passage_text'
      | 'annotations_json'
      | 'scheduled_at'
      | 'archived_at'
    >
  >
): Promise<EssayRow | null> {
  const db = getDb();
  const current = await getEssayById(id);
  if (!current) return null;
  const next = { ...current, ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)) };
  await db
    .prepare(
      `UPDATE essays SET title=?, slug=?, passage_ref=?, series_id=?, topic=?, summary=?, search_keywords=?,
       substack_url=?, status=?, body=?, passage_text=?, annotations_json=?, scheduled_at=?, archived_at=?,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`
    )
    .bind(
      next.title,
      next.slug,
      next.passage_ref,
      next.series_id,
      next.topic,
      next.summary,
      next.search_keywords,
      next.substack_url,
      next.status,
      next.body,
      next.passage_text,
      next.annotations_json,
      next.scheduled_at,
      next.archived_at,
      id
    )
    .run();
  return getEssayById(id);
}

export async function deleteEssay(id: string): Promise<void> {
  const db = getDb();
  await db.prepare('DELETE FROM essays WHERE id = ?').bind(id).run();
}

// --- Waitlist (subscribers) -------------------------------------------------

export interface WaitlistRow {
  id: string;
  email: string;
  source: string | null;
  created_at: string;
}

export async function listWaitlist(): Promise<WaitlistRow[]> {
  const db = getDb();
  const { results } = await db.prepare('SELECT * FROM waitlist ORDER BY created_at DESC').all<WaitlistRow>();
  return results ?? [];
}

// --- Broadcasts -------------------------------------------------------------

export async function listBroadcasts(): Promise<BroadcastRow[]> {
  const db = getDb();
  const { results } = await db.prepare('SELECT * FROM broadcasts ORDER BY created_at DESC').all<BroadcastRow>();
  return results ?? [];
}

// --- Donations --------------------------------------------------------------

export async function listDonations(limit = 200): Promise<DonationRow[]> {
  const db = getDb();
  const { results } = await db
    .prepare('SELECT * FROM donations ORDER BY created_at DESC LIMIT ?')
    .bind(limit)
    .all<DonationRow>();
  return results ?? [];
}

export async function findDonationByCheckoutSession(sessionId: string): Promise<DonationRow | null> {
  const db = getDb();
  const row = await db
    .prepare('SELECT * FROM donations WHERE stripe_checkout_session_id = ?')
    .bind(sessionId)
    .first<DonationRow>();
  return row ?? null;
}

export async function findDonationByInvoice(invoiceId: string): Promise<DonationRow | null> {
  const db = getDb();
  const row = await db.prepare('SELECT * FROM donations WHERE stripe_invoice_id = ?').bind(invoiceId).first<DonationRow>();
  return row ?? null;
}

export async function createDonation(fields: {
  email: string;
  name: string | null;
  amount_cents: number;
  currency: string;
  frequency: 'one_time' | 'monthly';
  status: string;
  source: string;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_subscription_id: string | null;
  stripe_invoice_id: string | null;
}): Promise<DonationRow> {
  const db = getDb();
  const id = uuid();
  await db
    .prepare(
      `INSERT INTO donations
       (id, email, name, amount_cents, currency, frequency, status, source,
        stripe_customer_id, stripe_checkout_session_id, stripe_subscription_id, stripe_invoice_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      fields.email.toLowerCase(),
      fields.name,
      fields.amount_cents,
      fields.currency,
      fields.frequency,
      fields.status,
      fields.source,
      fields.stripe_customer_id,
      fields.stripe_checkout_session_id,
      fields.stripe_subscription_id,
      fields.stripe_invoice_id
    )
    .run();
  return (await db.prepare('SELECT * FROM donations WHERE id = ?').bind(id).first<DonationRow>())!;
}

export async function updateDonationStatus(id: string, status: string): Promise<void> {
  const db = getDb();
  await db
    .prepare("UPDATE donations SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?")
    .bind(status, id)
    .run();
}

export async function setUserStripeCustomerId(userEmail: string, stripeCustomerId: string): Promise<void> {
  const db = getDb();
  await db
    .prepare('UPDATE users SET stripe_customer_id = ? WHERE email = ?')
    .bind(stripeCustomerId, userEmail.toLowerCase())
    .run();
}

// --- Email templates ----------------------------------------------------

export async function listEmailTemplates(): Promise<EmailTemplateRow[]> {
  const db = getDb();
  const { results } = await db.prepare('SELECT * FROM email_templates ORDER BY key ASC').all<EmailTemplateRow>();
  return results ?? [];
}

export async function upsertEmailTemplate(key: string, subject: string, introHtml: string): Promise<void> {
  const db = getDb();
  await db
    .prepare(
      `INSERT INTO email_templates (key, subject, intro_html) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET subject = excluded.subject, intro_html = excluded.intro_html,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
    )
    .bind(key, subject, introHtml)
    .run();
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

export interface StudioDraftRow {
  id: string;
  user_id: string;
  title: string;
  data_json: string;
  series_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function listStudioDrafts(userId: string): Promise<StudioDraftRow[]> {
  const db = getDb();
  const { results } = await db
    .prepare('SELECT * FROM studio_drafts WHERE user_id = ? ORDER BY updated_at DESC')
    .bind(userId)
    .all<StudioDraftRow>();
  return results ?? [];
}

export async function getStudioDraft(id: string): Promise<StudioDraftRow | null> {
  const db = getDb();
  const row = await db.prepare('SELECT * FROM studio_drafts WHERE id = ?').bind(id).first<StudioDraftRow>();
  return row ?? null;
}

export async function createStudioDraft(userId: string, title: string, dataJson: string): Promise<StudioDraftRow> {
  const db = getDb();
  const id = uuid();
  await db
    .prepare('INSERT INTO studio_drafts (id, user_id, title, data_json) VALUES (?, ?, ?, ?)')
    .bind(id, userId, title, dataJson)
    .run();
  return (await getStudioDraft(id))!;
}

export async function updateStudioDraft(id: string, title: string, dataJson: string): Promise<StudioDraftRow | null> {
  const db = getDb();
  const existing = await getStudioDraft(id);
  if (!existing) return null;
  await db
    .prepare(
      "UPDATE studio_drafts SET title = ?, data_json = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?"
    )
    .bind(title, dataJson, id)
    .run();
  return getStudioDraft(id);
}

export async function deleteStudioDraft(id: string): Promise<void> {
  const db = getDb();
  await db.prepare('DELETE FROM studio_drafts WHERE id = ?').bind(id).run();
}

export async function linkStudioDraftSeries(draftId: string, seriesId: string): Promise<void> {
  const db = getDb();
  await db.prepare('UPDATE studio_drafts SET series_id = ? WHERE id = ?').bind(seriesId, draftId).run();
}

/**
 * Essays for a Studio workspace's Essays tab: essays already attached to
 * this workspace's linked series, plus every standalone essay (series_id
 * IS NULL) app-wide — the Studio Essays tab and the Admin Essays page are
 * two views of the same collection, so standalone essays are visible from
 * any workspace, not owned by one.
 */
export async function listEssaysForWorkspace(seriesId: string | null): Promise<EssayRow[]> {
  const db = getDb();
  const { results } = seriesId
    ? await db
        .prepare('SELECT * FROM essays WHERE series_id = ? OR series_id IS NULL ORDER BY created_at DESC')
        .bind(seriesId)
        .all<EssayRow>()
    : await db.prepare('SELECT * FROM essays WHERE series_id IS NULL ORDER BY created_at DESC').all<EssayRow>();
  return results ?? [];
}

async function uniqueSlug(db: ReturnType<typeof getDb>, title: string): Promise<string> {
  const base = slugify(title);
  let slug = base;
  let n = 1;
  while (await db.prepare('SELECT 1 FROM series WHERE slug = ?').bind(slug).first()) {
    slug = `${base}-${++n}`;
  }
  return slug;
}

/**
 * Creates the series row a Studio workspace's Series tab is building, or
 * updates it if one is already linked. Returns the series and whether it
 * was newly created (callers link the new id back onto the draft).
 */
export async function upsertWorkspaceSeries(
  existingSeriesId: string | null,
  fields: {
    title: string;
    subtitle: string | null;
    kind: SeriesRow['kind'];
    status: SeriesRow['status'];
    description: string | null;
  }
): Promise<{ series: SeriesRow; created: boolean }> {
  if (existingSeriesId) {
    const series = await updateSeries(existingSeriesId, fields);
    if (series) return { series, created: false };
    // Linked id no longer exists (e.g. deleted directly) — fall through and create fresh.
  }

  const db = getDb();
  const id = uuid();
  const slug = await uniqueSlug(db, fields.title);
  await db
    .prepare(
      `INSERT INTO series (id, slug, title, subtitle, passage, total_days, days_json, kind, status, description)
       VALUES (?, ?, ?, ?, NULL, 0, '[]', ?, ?, ?)`
    )
    .bind(id, slug, fields.title, fields.subtitle, fields.kind, fields.status, fields.description)
    .run();
  return { series: (await getSeriesById(id))!, created: true };
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'series'
  );
}

/**
 * Publishes a Studio draft's days into the shared `series` table. If the
 * draft already has a linked series (from the Series tab), updates that
 * row in place rather than creating a duplicate; otherwise inserts a new
 * draft-status row, matching the kind/access/free_days convention already
 * used there so it shows up in the existing admin's Reading Series list.
 */
export async function publishStudioDraftAsSeries(
  existingSeriesId: string | null,
  title: string,
  subtitle: string | null,
  passage: string | null,
  kind: string,
  days: SeriesDay[]
): Promise<SeriesRow> {
  const days_json = JSON.stringify(days);

  if (existingSeriesId) {
    const updated = await updateSeries(existingSeriesId, {
      title,
      subtitle,
      passage,
      total_days: days.length,
      days_json,
      kind: kind as SeriesRow['kind'],
    });
    if (updated) return updated;
    // Linked id no longer exists — fall through and create fresh below.
  }

  const db = getDb();
  const id = uuid();
  const slug = await uniqueSlug(db, title);
  await db
    .prepare(
      `INSERT INTO series (id, slug, title, subtitle, passage, total_days, days_json, kind, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
    )
    .bind(id, slug, title, subtitle, passage, days.length, days_json, kind)
    .run();

  return (await getSeriesById(id))!;
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
