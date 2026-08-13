import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { listWaitlist } from '@/lib/repo';

export default async function SubscribersHome() {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');

  const waitlist = await listWaitlist();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = waitlist.filter((w) => new Date(w.created_at).getTime() >= weekAgo).length;

  const bySource = new Map<string, number>();
  for (const w of waitlist) {
    const key = w.source || 'unknown';
    bySource.set(key, (bySource.get(key) || 0) + 1);
  }
  const topSources = Array.from(bySource.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <p className="crumb">Audience</p>
      <h1>Subscribers</h1>
      <p className="sub">Who&rsquo;s on the list, and where they came from.</p>

      <div className="grid grid--stats">
        <div className="card card--top">
          <div className="stat__n">{waitlist.length}</div>
          <div className="stat__l">Total</div>
          <div className="stat__d">+{newThisWeek} this week</div>
        </div>
        {topSources.slice(0, 3).map(([source, count]) => (
          <div className="card" key={source}>
            <div className="stat__n">{count}</div>
            <div className="stat__l">{source}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        {waitlist.map((w) => (
          <div className="row" key={w.id}>
            <div className="row__main">
              <div className="row__t">{w.email}</div>
              <div className="row__s">
                Joined {new Date(w.created_at).toLocaleDateString()} · {w.source || 'unknown source'}
              </div>
            </div>
          </div>
        ))}
        {waitlist.length === 0 && <p className="note">No subscribers yet.</p>}
      </div>
    </>
  );
}
