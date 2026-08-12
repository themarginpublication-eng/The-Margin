import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { listDonations } from '@/lib/repo';

export default async function DonationsHome() {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');

  const donations = await listDonations();
  const totalCents = donations.filter((d) => d.status === 'succeeded').reduce((sum, d) => sum + d.amount_cents, 0);

  return (
    <div className="admin">
      <h1>Donations</h1>
      <p className="admin__lede">
        Read-only ledger, written by the Stripe webhook. {donations.length} record{donations.length === 1 ? '' : 's'} · $
        {(totalCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} succeeded.
      </p>
      <div className="admin__nav">
        <a href="/admin">← Admin home</a>
      </div>

      <div className="admin-group">
        <ul className="admin-list">
          {donations.map((d) => (
            <li key={d.id}>
              <span style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 4px' }}>
                <span className="admin-list__title">
                  ${(d.amount_cents / 100).toFixed(2)} {d.frequency === 'monthly' ? '/mo' : ''} — {d.email}
                </span>
                <span className="admin-list__meta">
                  {d.status} · {d.source} · {new Date(d.created_at).toLocaleString()}
                </span>
              </span>
            </li>
          ))}
          {donations.length === 0 && <p className="admin__lede">No donations yet.</p>}
        </ul>
      </div>
    </div>
  );
}
