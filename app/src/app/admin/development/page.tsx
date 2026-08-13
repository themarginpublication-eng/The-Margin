import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';

export default async function DevelopmentHome() {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');

  return (
    <>
      <p className="crumb">Plan</p>
      <h1>Development</h1>
      <p className="sub">
        The launch plan, mirrored from Notion (the margin · hq → Launch Plan). Notion&rsquo;s Command Center stays the source of
        truth — this is the at-a-glance copy. Phase 5 is 9 numbered build-order steps matching BACKEND-REQUIREMENTS.md. Essays are
        hosted on the website; Substack is a repost channel, not the home.
      </p>

      <div className="grid grid--stats">
        <div className="card card--top">
          <div className="stat__n">Aug 24</div>
          <div className="stat__l">Soft launch</div>
          <div className="stat__d">founding circle, 20–30 personal invites</div>
        </div>
        <div className="card">
          <div className="stat__n">Sep 14</div>
          <div className="stat__l">Public launch</div>
          <div className="stat__d">all 5 channels</div>
        </div>
        <div className="card">
          <div className="stat__n">Jul 18</div>
          <div className="stat__l">Series lock</div>
          <div className="stat__d">candidates still open — name its 6–8 skills first</div>
        </div>
        <div className="card">
          <div className="stat__n">Oct 11–25</div>
          <div className="stat__l">Protected</div>
          <div className="stat__d">wedding — nothing due, coast on the bank</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Phase 1 · Content</h3>
        <p className="hint">
          The 30 mornings in four movements: Read it cold → The world behind it → What scholars see → Make it yours. (Series not
          locked yet — the movements apply to whichever passage you choose.)
        </p>
        {[
          ['Lock the launch series + passage', 'Jul 18 · P1 · test: can you name the 6–8 skills it teaches?'],
          ['Build the content pipeline', 'Jul 20 · P1 · HQ databases: study → ideas → drafting → calendar → archive'],
          ['Movement 1 — Read it cold (mornings 1–7)', 'Jul 27 · P1 · observe: see before explaining'],
          ['Movement 2 — The world behind it (8–14)', 'Aug 3 · P1 · one piece of context per morning'],
          ['Movement 3 — What scholars see (15–21)', 'Aug 10 · P1 · exit skill: open a cross-reference alone'],
          ['Define cadence after series 1', 'Aug 13 · P2 · promise the floor, deliver the ceiling'],
          ["Welcome email + first week's sequence", 'Aug 14 · P1 · one ask per email'],
          ['Movement 4 — Make it yours (22–30)', 'Aug 17 · P1 · completes the bank; October coasts'],
        ].map(([t, s]) => (
          <div className="row" key={t}>
            <div className="row__main">
              <div className="row__t">{t}</div>
              <div className="row__s">{s}</div>
            </div>
            <span className="badge badge--draft">Not started</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Phase 2 · Website</h3>
        {[
          ['Domain + DNS + hosting', 'Jul 21 · P1 · readthemargin.net live with HTTPS, hello@ forwarding', 'Done', 'badge--live'],
          ['Final copy pass on all pages', 'Jul 24 · P2 · read aloud: slow not boring, one ask per page', 'In progress', 'badge--sched'],
          ['Development pass — prototype → production', 'Jul 28 · P1 · favicon, OG images, 404, no placeholders', 'In progress', 'badge--sched'],
          ['Wire the real subscribe form', 'Jul 30 · P1 · one list, no split-brain; test the full loop', 'In progress', 'badge--sched'],
          ['Mobile QA on real devices', 'Jul 31 · P2 · the reader is on a phone at 6:45am', 'Not started', 'badge--draft'],
          ['Module page (series syllabus view)', 'Aug 5 · P1 · skills ladder + 30 mornings grouped by movement', 'Not started', 'badge--draft'],
        ].map(([t, s, badge, cls]) => (
          <div className="row" key={t}>
            <div className="row__main">
              <div className="row__t">{t}</div>
              <div className="row__s">{s}</div>
            </div>
            <span className={`badge ${cls}`}>{badge}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Phase 3 · Giving</h3>
        {[
          ['Choose + open a giving platform', 'Jul 23 · P1 · Stripe / Donorbox / Givebutter — decide in one sitting'],
          ["Bank / tax / entity details", "Jul 31 · P1 · start simplest; don't let paperwork block launch"],
          ['One-time + recurring giving', 'Aug 7 · P2 · $5/$15/$25, invitation not urgency'],
          ['Giving links across the site', 'Aug 14 · P2 · present everywhere, loud nowhere'],
        ].map(([t, s]) => (
          <div className="row" key={t}>
            <div className="row__main">
              <div className="row__t">{t}</div>
              <div className="row__s">{s}</div>
            </div>
            <span className="badge badge--draft">Not started</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Phase 4 · Launch &amp; grow</h3>
        {[
          ['Alpha test — end-to-end walkthrough', 'Aug 12 · P1 · signup → welcome → morning 1 → $1 donation → unsubscribe'],
          ['Basic analytics', 'Aug 21 · P2 · three questions only; no dashboards'],
          ['Soft launch to founding circle', 'Aug 24 · P1 · personal texts, no broadcast; reply to everything'],
          ['Incorporate soft-launch feedback', 'Sep 4 · P1 · fix now / fix in rhythm / note for later'],
          ['Public launch announcement', 'Sep 14 · P1 · all 5 channels → Start Here; launch week pre-scheduled'],
          ['Plan series #2 + pre-schedule October', 'Sep 28 · P3 · the bank carries the wedding fortnight'],
        ].map(([t, s]) => (
          <div className="row" key={t}>
            <div className="row__main">
              <div className="row__t">{t}</div>
              <div className="row__s">{s}</div>
            </div>
            <span className="badge badge--draft">Not started</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Phase 5 · Backend &amp; app (post-validation)</h3>
        <p className="hint">
          Only if the data says accounts are worth it. Threshold: 150+ subscribers and a rhythm that feels easy. Everything below
          is spec&rsquo;d in <strong>merge_for_claude_code → BACKEND-REQUIREMENTS.md</strong>. The gates come first (Nov 2, Jan 4);
          steps ①–⑨ are the build order — <strong>one at a time, each depends on the one before</strong>.
        </p>
        {[
          ['Backend checkpoint — review the data, decide go / no-go', 'Nov 2 · P1 · gates everything below · 150+ subs & an easy rhythm = GO'],
          ['Backend go-decision + hand the spec to the developer', 'Jan 4 · P1 · confirm Cloudflare Workers + D1; hand off merge_for_claude_code'],
          ['① Data model + migrations — stand up all the tables', 'Jan 11 · P1 · series, days, essays, subscribers, enrollments, templates, copy, events'],
          ['② Subscribe API + series picker + enrollment', 'Jan 18 · P1 · a real signup lands in the DB with the right enrollment'],
          ['③ Delivery engine — the daily drip + welcome/Day-1', 'Jan 25 · P1 · the heart of it · Day 1 now, Day 2 tomorrow at 6am, automatically'],
          ['④ Series access gate on the read route', 'Feb 1 · P1 · open vs gated; free days, then the subscribe gate'],
          ['⑤ Admin CRUD — make this dashboard edit the DB', 'Feb 8 · P2 · series, daily notes, essays, subscribers, emails, copy'],
          ['⑥ Reader auth + app parity (one login, both skins)', 'Feb 15 · P2 · magic-link on email; site & app share progress'],
          ['⑦ Essay publish + substack_url + library', 'Feb 22 · P2 · library search/chips; the "Also on Substack" link'],
          ['⑧ Subscriber import from Substack (CSV → Make.com)', 'Mar 1 · P2 · one-way, dedupe by email; CSV first, automation later'],
          ['⑨ Analytics + deliverability + backups → redeploy', 'Mar 8 · P2 · real stats, SPF/DKIM/DMARC, D1 backups, then ship'],
        ].map(([t, s]) => (
          <div className="row" key={t}>
            <div className="row__main">
              <div className="row__t">{t}</div>
              <div className="row__s">{s}</div>
            </div>
            <span className="badge badge--draft">Not started</span>
          </div>
        ))}
      </div>

      <p className="note" style={{ marginTop: 16 }}>
        Protected: Oct 11–25 (wedding) and every Wednesday (youth ministry — pre-scheduled posts only). 90-day targets: 100 founding
        subscribers · 8+ published notes · 3 consistent channels. <em>Don&rsquo;t launch loud. Launch sustainable.</em>
      </p>
    </>
  );
}
