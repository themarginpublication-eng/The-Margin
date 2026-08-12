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
              <span className="admin-list__meta">seed → six-move method → publishable days →</span>
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
                <span className="admin-list__title">{s.title}</span>
                <span className="admin-list__meta">{s.total_days} mornings →</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
