# The Margin — Website + Reader App

A Bible-reading companion: short guided readings with historical/cultural context beside the
text. Daily margin notes within each series, plus a long-form article at least once a month
(often more).

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

- **Tables** (`migrations/0001_init.sql` + `migrations/0002_cms.sql` + `migrations/0003_studio.sql`):
  `users`, `auth_identities`, `series`, `progress`, `waitlist`, `site_content` for the admin panel
  below, and `studio_drafts` for the Studio (see below). Run any not yet applied to the live
  `the-margin-db` with `wrangler d1 execute the-margin-db --remote --file migrations/000N_*.sql`.
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
- **`/admin/studio`** — the Studio: an authoring backend that takes a seed (a passage, person,
  book, book-you-read, idea, or word) through a six-move method (cut the unit → observe → the
  idea → the last day → deal the days → shape the day) into a finished, sectioned series. Guided
  mode walks the moves in order with live readiness checks; free mode drops the method entirely
  for a bare title/notes/days draft — switching modes never loses the other's data. Every move can
  be renamed, reordered or turned off (`app/src/app/admin/studio/StudioEditor.tsx`); the method's
  reference data (question types, day-count plans, per-seed-type guidance, the worked "Empty and
  Full" example on Ruth) lives in `app/src/lib/studio-data.ts`. State autosaves to the
  `studio_drafts` table per admin user via `/api/admin/studio*`. "Publish to series" writes a
  finished draft straight into the `series` table as `status='draft'` (same table `/admin/series`
  and the marketing site read from) — mapping a finished day onto the social template library is
  still a later integration.
- **`/admin/essays`** — the biweekly long-form article (separate from daily series readings):
  title/slug/passage/topic/summary, full HTML `body`, the `passage_text` it annotates, an
  `annotations_json` array of margin notes, draft/published status, and an optional
  `scheduled_at` (auto-published by `the-margin-mailer`'s cron).
- **`/admin/broadcasts`** — compose a one-off email (subject + HTML body), pick a recipient filter
  (all subscribers, readers of one series, or a custom list), send now or schedule for later. Send
  goes through `the-margin-mailer`'s `POST /broadcast` (see below); history is read back from the
  `broadcasts` table it writes to.
- **`/admin/donations`** — read-only ledger of Stripe-backed gifts, written by
  `/api/webhooks/stripe`.
- **`/admin/email-templates`** — subject/intro-HTML overrides for `the-margin-mailer`'s
  transactional emails (`daily-note`, `welcome-later`); blank fields fall back to that worker's
  built-in copy.

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
wrangler secret put STRIPE_SECRET_KEY      # Stripe secret key — powers /api/give/checkout
wrangler secret put STRIPE_WEBHOOK_SECRET  # Stripe webhook signing secret — /api/webhooks/stripe
wrangler secret put MAILER_INTERNAL_KEY    # shared secret sent as x-trigger-key to the-margin-mailer
wrangler secret put NOTION_TOKEN           # Notion integration token (reader sync not yet wired up)
```

Without the Google secrets set, password sign-in still works; the "Continue with Google" button
returns a clear 501 instead of failing silently. All of the above are already set on the live
`the-margin-app` worker.

### `the-margin-mailer` — separate worker, separate deploy

A second Worker (not in this repo — recovered by reading its deployed bundle, which happens to be
un-minified) sends all transactional and campaign email via Resend. It exposes, all
`x-trigger-key`-authenticated except `/unsubscribe` and `GET /start/:slug`:

- `POST /run` — the daily drip send (also runs on its own `0 12 * * *` cron)
- `POST /enroll`, `POST /welcome`, `POST /give-thankyou`, `POST /magic-link`, `POST /test-send`
- `POST /broadcast` — used by `/admin/broadcasts`; if `scheduledAt` is in the future it queues a row
  instead of sending immediately, picked up by the worker's other (non-daily) cron tick alongside
  scheduled essay publishing.

Its own env needs `DB` (same D1), `RESEND_API_KEY`, `FROM_EMAIL`, `SITE_URL`, `UNSUB_SECRET`,
`INTERNAL_API_KEY` (matches this app's `MAILER_INTERNAL_KEY`). Source isn't in this repo — if it
ever needs changes, pull it fresh from Cloudflare (`workers_get_worker_code` / dashboard Quick
Edit) rather than assuming a local copy is current.

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

- **Verify the Stripe webhook endpoint URL.** `STRIPE_WEBHOOK_SECRET` was already set before
  `/api/webhooks/stripe` existed in this repo (the original handler's source was lost — see below).
  Confirm in the Stripe Dashboard that the webhook endpoint actually points at
  `https://app.readthemargin.net/api/webhooks/stripe`, or update it to match; otherwise donations
  won't record even though checkout succeeds.
- **Test a real `/give` flow end-to-end** (small live amount or Stripe test mode) — the checkout +
  webhook + `/admin/donations` + mailer thank-you path is implemented from Stripe's documented API
  and `the-margin-mailer`'s contract, but wasn't exercised against a live Stripe account from here.
- **Notion reader sync isn't implemented.** `users.notion_page_id` and `NOTION_TOKEN` /
  `NOTION_READERS_DATABASE_ID` exist and are wired into the `Env` type, but nothing calls the
  Notion API — the original sync behavior wasn't recoverable from schema alone, and guessing wrong
  risks writing bad data into a live Notion workspace.
- **Google OAuth credentials** — needs a real Client ID/Secret from Google Cloud Console with the
  redirect URI registered.
- **More series** — the schema supports any number of `series` rows; several already exist as
  `status='draft'`.

### On the missing source (read before assuming anything is "clean")

A previous session built substantial parts of this app (Stripe donations, essays, broadcasts,
Notion reader sync, the daily/welcome/thank-you email flow) directly against Cloudflare and never
pushed the code to this repo — likely hitting the same GitHub write-permission gap this session
did. That source is not recoverable from Cloudflare (deployed Workers can't be downloaded back out
as editable source) and wasn't in the one recovered git bundle either (which only had `site/`
marketing pages). Everything under "Content & giving" in the admin, plus `/api/give/checkout` and
`/api/webhooks/stripe`, was reconstructed from the live D1 schema and `the-margin-mailer`'s
deployed source (which happens to be unminified and readable) — it should be functionally
equivalent, but hasn't been verified against the original behavior line-by-line. If a *second*
bundle or another machine's clone turns up with the real `app/` source (not just `site/`), prefer
that over this reconstruction.

## Original handoff context

- Domain **readthemargin.net** is registered at Cloudflare (DNS + email routing live there;
  `hello@readthemargin.net` forwards to the owner's Gmail).
- Transactional/newsletter email is **Sender.net** — email only; it is not the app backend.
- Voice: warm, unhurried, pastoral. Tagline: "Say it slow. Say it true." Never emoji.
- Design tokens: parchment `#F3EEE3`, vellum `#FAF6EC`, margin `#C9BFAE`, rust `#A8593C`, gilt
  `#B68A47`, ash `#6B5F54`, ink `#1A1814`. Fonts: Fraunces (display), Newsreader (body serif),
  Inter (sans/UI) — Google Fonts.
