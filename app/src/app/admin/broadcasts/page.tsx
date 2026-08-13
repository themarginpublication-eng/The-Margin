import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { listBroadcasts, listSeries } from '@/lib/repo';
import BroadcastComposer from './BroadcastComposer';

export default async function BroadcastsHome() {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');

  const [broadcasts, series] = await Promise.all([listBroadcasts(), listSeries()]);

  return (
    <>
      <p className="crumb">Audience</p>
      <h1>Broadcasts</h1>
      <p className="sub">One-off email campaigns, sent via the mailer to a filtered recipient list.</p>

      <div className="card">
        <h3>Compose</h3>
        <BroadcastComposer series={series.map((s) => ({ id: s.id, title: s.title }))} />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>History</h3>
        {broadcasts.map((b) => (
          <div className="row" key={b.id}>
            <div className="row__main">
              <div className="row__t">{b.subject}</div>
              <div className="row__s">
                {b.sent_at
                  ? `sent to ${b.recipient_label} · ${b.sent_count} ok / ${b.failed_count} failed`
                  : b.scheduled_at
                    ? `scheduled for ${b.scheduled_at}`
                    : 'pending'}
              </div>
            </div>
          </div>
        ))}
        {broadcasts.length === 0 && <p className="note">No broadcasts sent yet.</p>}
      </div>
    </>
  );
}
