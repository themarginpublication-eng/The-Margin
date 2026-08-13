import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { listEssays, listSeries, listWaitlist } from '@/lib/repo';
import type { SeriesDay } from '@/lib/repo';

export default async function AdminHome() {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');

  const [series, essays, waitlist] = await Promise.all([listSeries(), listEssays(), listWaitlist()]);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = waitlist.filter((w) => new Date(w.created_at).getTime() >= weekAgo).length;

  const liveSeries = series.filter((s) => s.status === 'live');
  const totalMornings = liveSeries.reduce((sum, s) => sum + s.total_days, 0);
  const publishedEssays = essays.filter((e) => e.status === 'published' && !e.archived_at);
  const draftEssays = essays.filter((e) => e.status === 'draft' && !e.archived_at);

  const emptyDays: { seriesTitle: string; seriesId: string; day: number; title: string }[] = [];
  for (const s of series) {
    let days: SeriesDay[] = [];
    try {
      days = JSON.parse(s.days_json);
    } catch {
      continue;
    }
    for (const d of days) {
      if (!d.verse && !d.reading?.context) {
        emptyDays.push({ seriesTitle: s.title, seriesId: s.id, day: d.day, title: d.title || `Day ${d.day}` });
      }
    }
  }

  return (
    <>
      <p className="crumb">Overview</p>
      <h1>Good morning.</h1>
      <p className="sub">Everything on the site is editable from here — series, daily notes, essays, emails, and the site&rsquo;s own words.</p>

      <div className="grid grid--stats">
        <div className="card card--top">
          <div className="stat__n">{waitlist.length}</div>
          <div className="stat__l">Subscribers</div>
          <div className="stat__d">+{newThisWeek} this week</div>
        </div>
        <div className="card">
          <div className="stat__n">{totalMornings}</div>
          <div className="stat__l">Mornings loaded</div>
          <div className="stat__d">across {liveSeries.length} live series</div>
        </div>
        <div className="card">
          <div className="stat__n">{publishedEssays.length}</div>
          <div className="stat__l">Essays published</div>
        </div>
        <div className="card">
          <div className="stat__n">{liveSeries.length}</div>
          <div className="stat__l">Series live</div>
          <div className="stat__d">{series.length - liveSeries.length} planned or retired</div>
        </div>
      </div>

      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Needs your attention</h3>
          <p className="hint">Empty mornings and draft essays, so nothing sends empty.</p>
          {emptyDays.slice(0, 5).map((d, i) => (
            <div className="row" key={i}>
              <div className="row__main">
                <div className="row__t">
                  {d.seriesTitle} — {d.title}
                </div>
                <div className="row__s">Day {d.day} is empty</div>
              </div>
              <a className="btn btn--sm" href={`/admin/notes?series=${d.seriesId}`}>
                Write it
              </a>
            </div>
          ))}
          {draftEssays.slice(0, 3).map((e) => (
            <div className="row" key={e.id}>
              <div className="row__main">
                <div className="row__t">{e.title || 'Untitled essay'} — draft</div>
                <div className="row__s">Last edited {new Date(e.updated_at).toLocaleDateString()}</div>
              </div>
              <a className="btn btn--ghost btn--sm" href={`/admin/essays/${e.id}`}>
                Open
              </a>
            </div>
          ))}
          {emptyDays.length === 0 && draftEssays.length === 0 && <p className="note">Nothing waiting on you.</p>}
        </div>
        <div className="card">
          <h3>Recently updated</h3>
          <p className="hint">The last few essays touched.</p>
          {essays
            .slice()
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, 5)
            .map((e) => (
              <div className="row" key={e.id}>
                <span className={`badge${e.status === 'published' ? ' badge--live' : ' badge--draft'}`}>{e.status}</span>
                <div className="row__main">
                  <div className="row__t">{e.title || 'Untitled essay'}</div>
                  <div className="row__s">{new Date(e.updated_at).toLocaleDateString()}</div>
                </div>
                <a className="btn btn--ghost btn--sm" href={`/admin/essays/${e.id}`}>
                  Edit
                </a>
              </div>
            ))}
          {essays.length === 0 && <p className="note">No essays yet.</p>}
        </div>
      </div>

      <div className="qa">
        <a className="btn" href="/admin/notes">
          + New daily note
        </a>
        <a className="btn btn--ghost" href="/admin/essays">
          + New essay
        </a>
        <a className="btn btn--ghost" href="/admin/series">
          + New series
        </a>
        <a className="btn btn--ghost" href="/admin/studio">
          Open the Studio &rarr;
        </a>
      </div>
    </>
  );
}
