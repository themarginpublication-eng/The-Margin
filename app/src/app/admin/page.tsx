import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { listSeries } from '@/lib/repo';

export default async function AdminHome() {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');

  const series = await listSeries();

  return (
    <div className="admin">
      <h1>Admin</h1>
      <p className="admin__lede">Signed in as {admin.name} · {admin.email}</p>

      <div className="admin-group">
        <h2>Marketing site</h2>
        <ul className="admin-list">
          <li>
            <a href="/admin/site">
              <span className="admin-list__title">Edit page wording &amp; blocks</span>
              <span className="admin-list__meta">index, about, read, series, subscribe →</span>
            </a>
          </li>
        </ul>
      </div>

      <div className="admin-group">
        <h2>Studio</h2>
        <ul className="admin-list">
          <li>
            <a href="/admin/studio">
              <span className="admin-list__title">Draft a new series</span>
              <span className="admin-list__meta">seed → six-move method → days, plus its essays, in one workspace →</span>
            </a>
          </li>
        </ul>
      </div>

      <div className="admin-group">
        <h2>Reading series</h2>
        <ul className="admin-list">
          {series.map((s) => (
            <li key={s.id}>
              <a href={`/admin/series/${s.id}`}>
                <span className="admin-list__title">
                  {s.title} {s.status !== 'live' && <span className="admin-block__flag">{s.status}</span>}
                </span>
                <span className="admin-list__meta">{s.total_days} mornings →</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="admin-group">
        <h2>Content &amp; giving</h2>
        <ul className="admin-list">
          <li>
            <a href="/admin/essays">
              <span className="admin-list__title">Essays</span>
              <span className="admin-list__meta">the biweekly long-form article →</span>
            </a>
          </li>
          <li>
            <a href="/admin/broadcasts">
              <span className="admin-list__title">Broadcasts</span>
              <span className="admin-list__meta">one-off email campaigns →</span>
            </a>
          </li>
          <li>
            <a href="/admin/donations">
              <span className="admin-list__title">Donations</span>
              <span className="admin-list__meta">Stripe-backed giving ledger →</span>
            </a>
          </li>
          <li>
            <a href="/admin/email-templates">
              <span className="admin-list__title">Email templates</span>
              <span className="admin-list__meta">subject/intro copy for transactional email →</span>
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
