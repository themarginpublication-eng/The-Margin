import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { listBroadcasts, listSeries } from '@/lib/repo';
import BroadcastComposer from './BroadcastComposer';

export default async function BroadcastsHome() {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');

  const [broadcasts, series] = await Promise.all([listBroadcasts(), listSeries()]);

  return (
    <div className="admin">
      <h1>Broadcasts</h1>
      <p className="admin__lede">One-off email campaigns, sent via the mailer to a filtered recipient list.</p>
      <div className="admin__nav">
        <a href="/admin">← Admin home</a>
      </div>

      <div className="admin-group">
        <h2>Compose</h2>
        <BroadcastComposer series={series.map((s) => ({ id: s.id, title: s.title }))} />
      </div>

      <div className="admin-group">
        <h2>History</h2>
        <ul className="admin-list">
          {broadcasts.map((b) => (
            <li key={b.id}>
              <span style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 4px' }}>
                <span className="admin-list__title">{b.subject}</span>
                <span className="admin-list__meta">
                  {b.sent_at
                    ? `sent to ${b.recipient_label} · ${b.sent_count} ok / ${b.failed_count} failed`
                    : b.scheduled_at
                      ? `scheduled for ${b.scheduled_at}`
                      : 'pending'}
                </span>
              </span>
            </li>
          ))}
          {broadcasts.length === 0 && <p className="admin__lede">No broadcasts sent yet.</p>}
        </ul>
      </div>
    </div>
  );
}
