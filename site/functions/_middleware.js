// Cloudflare Pages Function — runs in front of every request to site/.
// Applies admin-authored overrides from the `site_content` D1 table on top of
// the static HTML: whole-block swaps for anything carrying data-screen-label,
// plus two fixed injection points per page (<!--cms:head-extra--> and
// <!--cms:body-end-->) for arbitrary pasted-in code. See app/src/app/admin/site
// for the editor and app/src/lib/site-manifest.json for the key list — this
// file's slugify() must stay in sync with scripts/extract-site-content.mjs.

const PAGES = ['index', 'about', 'read', 'series', 'subscribe'];
const BLOCK_RE = /<(section|header|footer)\b([^>]*data-screen-label="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g;

function slugify(label) {
  return label
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const response = await next();

  if (!response.ok) return response;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const url = new URL(request.url);
  const base = url.pathname.split('/').pop() || 'index.html';
  const page = base.replace(/\.html$/, '') || 'index';
  if (!PAGES.includes(page)) return response;

  let html = await response.text();

  const found = [];
  const keys = new Set([`${page}-head-extra`, `${page}-body-end`]);
  BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = BLOCK_RE.exec(html))) {
    const [full, tag, , label] = m;
    const key = slugify(label);
    found.push({ key, tag, full });
    keys.add(key);
  }

  let overrides = {};
  try {
    const keyList = Array.from(keys);
    const placeholders = keyList.map(() => '?').join(', ');
    const { results } = await env.DB.prepare(`SELECT key, value FROM site_content WHERE key IN (${placeholders})`)
      .bind(...keyList)
      .all();
    for (const row of results || []) overrides[row.key] = row.value;
  } catch {
    // D1 unreachable — fall through and serve the file's baked-in defaults.
    return response;
  }

  for (const { key, tag, full } of found) {
    if (!(key in overrides)) continue;
    const openTagMatch = full.match(new RegExp(`^<${tag}\\b[^>]*>`));
    const openTag = openTagMatch ? openTagMatch[0] : full;
    html = html.replace(full, `${openTag}${overrides[key]}</${tag}>`);
  }

  if (overrides[`${page}-head-extra`]) {
    html = html.replace('<!--cms:head-extra-->', overrides[`${page}-head-extra`]);
  }
  if (overrides[`${page}-body-end`]) {
    html = html.replace('<!--cms:body-end-->', overrides[`${page}-body-end`]);
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}
