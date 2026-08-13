import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { listDonations } from '@/lib/repo';

export default async function DonationsHome() {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');

  const donations = await listDonations();
  const totalCents = donations.filter((d) => d.status === 'succeeded').reduce((sum, d) => sum + d.amount_cents, 0);

  return (
    <>
      <p className="crumb">Money</p>
      <h1>Donations</h1>
      <p className="sub">
        Read-only ledger, written by the Stripe webhook. {donations.length} record{donations.length === 1 ? '' : 's'} · $
        {(totalCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} succeeded.
      </p>

      <div className="card">
        {donations.map((d) => (
          <div className="row" key={d.id}>
            <span className={`badge${d.status === 'succeeded' ? ' badge--live' : ' badge--draft'}`}>{d.status}</span>
            <div className="row__main">
              <div className="row__t">
                ${(d.amount_cents / 100).toFixed(2)} {d.frequency === 'monthly' ? '/mo' : ''} — {d.email}
              </div>
              <div className="row__s">
                {d.source} · {new Date(d.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
        {donations.length === 0 && <p className="note">No donations yet.</p>}
      </div>
    </>
  );
}
