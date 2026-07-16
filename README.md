# The Margin — Website + Reader App

A Bible-reading companion: short guided readings with historical/cultural context beside the
text, delivered on a biweekly→weekly rhythm.

This repo has two deployable pieces:

1. **`site/`** — the marketing site (readthemargin.net). Static HTML/CSS/JS, deployable as-is to
   Cloudflare Pages, with a Pages Function backing the launch popup / subscribe forms.
2. **`app/`** — the reader app (accounts, Google + password auth, series progress). A Next.js app
   built for Cloudflare Workers via OpenNext, backed by the existing Cloudflare D1 database
   `the-margin-db`.

Design references live in `design/` (`App (Login).html`, `Backend Blueprint.html`,
`Brand Guide.html`, `Launch & Content Plan.html`) and are the source of truth for look, voice,
and data model; both pieces above were built to match them.

## `site/` — marketing site

Five static pages (`index`, `about`, `read`, `series`, `subscribe`) plus `styles.css` and
`site.js`. The launch popup and subscribe forms post to `POST /api/waitlist`
(`site/functions/api/waitlist.js`, a Cloudflare Pages Function) which inserts into the `waitlist`
table in D1, and optionally forwards to Sender.net if `SENDER_API_KEY` / `SENDER_GROUP_ID` are
set as Pages secrets.

**Deploy:** Cloudflare Pages, project root `site/`, build output `.` (no build step). The D1
binding (`DB` → `the-margin-db`) is already declared in `site/wrangler.toml` — confirm it's wired
in the Pages project settings (or via `wrangler pages deploy site --binding DB=...`).

## `app/` — reader app

Next.js (App Router, TypeScript), deployed to Cloudflare Workers via
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare). Data model, auth flows, and API
surface follow `design/Backend Blueprint.html` section by section:

- **Tables** (`migrations/0001_init.sql` + `migrations/0002_cms.sql`, already applied to the live
  `the-margin-db`): `users`, `auth_identities`, `series`, `progress`, `waitlist`, plus
  `site_content` for the admin panel below.
- **Auth**: email+password (bcrypt-hashed) and Google OAuth (authorization-code flow), both
  landing in the same `users` row via `auth_identities`. Sessions are a signed JWT in an
  httpOnly cookie (`jose`).
- **API**: `/api/auth/{signup,login,logout,google,google/callback}`, `/api/me`,
  `/api/me/progress`, `/api/me/progress/complete`, `/api/series/:id/day/:n` — matching Blueprint
  section 04.
- **UI**: `/login` (tabs for log in / create account + "Continue with Google") and `/dashboard`
  (progress track, stats, reading modal) — pixel-parity ports of `design/App (Login).html`.
- **Seed data**: the "How to Read a Psalm" series (Psalm 23, 30 mornings) is already seeded into
  `series` from the prototype's `MOVES`/`DAYS`/`READINGS` constants.

### Admin panel

`app.readthemargin.net/admin` (there's no nav link — it's reached by URL) lets whoever's email
is in the `ADMIN_EMAILS` var (`app/wrangler.toml`, comma-separated) edit the site without a code
change:

- **`/admin/site`** — every marketing-site section (`site/*.html`, wherever it carries a
  `data-screen-label` attribute) as an editable block. Leave it alone and the page keeps using the
  wording baked into the HTML file; type something and Save and that block is served from D1
  instead — wording tweaks or a full HTML replacement, since whatever's in the box becomes exactly
  what renders. "Reset to default" deletes the override. Two extra fields per page
  (`… — extra <head> code` / `… — extra code before </body>`) are blank injection points for
  pasting in arbitrary script/markup (analytics, embeds, etc.) without a redeploy.
- **`/admin/series/:id`** — series title/subtitle/passage, plus the full `days_json` as raw JSON
  for editing or adding mornings.

This is served by `site/functions/_middleware.js`, which rewrites the static HTML per-request
using the `site_content` D1 table (binding `DB`, already wired in `site/wrangler.toml`) — no
Pages redeploy needed to change wording. If a page's section structure changes (new/renamed
`data-screen-label`), rerun `node scripts/extract-site-content.mjs` from the repo root and commit
the regenerated `app/src/lib/site-manifest.json` so the admin UI's labels/defaults stay in sync.

### Required secrets before deploying

```
wrangler secret put SESSION_SECRET        # any random 32+ byte string
wrangler secret put GOOGLE_CLIENT_ID       # from Google Cloud Console OAuth credentials
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GOOGLE_REDIRECT_URI    # e.g. https://app.readthemargin.net/api/auth/google/callback
```

Without the Google secrets set, password sign-in still works; the "Continue with Google" button
returns a clear 501 instead of failing silently.

### Local development

```
cd app
npm install
npm run dev                 # next dev — hits your local Node runtime, D1 access needs cf:preview
npm run cf:build            # opennextjs-cloudflare build — produces .open-next/worker.js
npm run cf:preview          # run the built Worker locally against local D1
npm run cf:deploy           # deploy to Cloudflare Workers
```

### What's still open

- **Email verification / password reset** — the `email_verified` column and signup flow are in
  place, but no transactional email is wired up yet. Sender.net is email-only per the handoff
  notes; either use its transactional API or a dedicated provider (Resend, Postmark) for
  verification and reset emails.
- **Google OAuth credentials** — needs a real Client ID/Secret from Google Cloud Console with the
  redirect URI registered.
- **DNS/routing** — `site/` and `app/` are separate Cloudflare Pages/Workers projects; point
  `readthemargin.net` at the site and (for example) `app.readthemargin.net` at the reader app, or
  route `/app/*` to the Worker via a Cloudflare route, per your preference.
- **More series** — the schema supports any number of `series` rows; only Psalm 23 is seeded.

## Original handoff context

- Domain **readthemargin.net** is registered at Cloudflare (DNS + email routing live there;
  `hello@readthemargin.net` forwards to the owner's Gmail).
- Transactional/newsletter email is **Sender.net** — email only; it is not the app backend.
- Voice: warm, unhurried, pastoral. Tagline: "Say it slow. Say it true." Never emoji.
- Design tokens: parchment `#F3EEE3`, vellum `#FAF6EC`, margin `#C9BFAE`, rust `#A8593C`, gilt
  `#B68A47`, ash `#6B5F54`, ink `#1A1814`. Fonts: Fraunces (display), Newsreader (body serif),
  Inter (sans/UI) — Google Fonts.
