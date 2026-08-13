import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { listStudioDrafts } from '@/lib/repo';
import NewDraftButton from './NewDraftButton';

export default async function StudioHome() {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');

  const drafts = await listStudioDrafts(admin.id);

  return (
    <>
      <p className="crumb">Content</p>
      <h1>Content Studio</h1>
      <p className="sub">Turn a seed into a sectioned, multi-day series — with its essays — before it ever reaches the template library.</p>

      <div className="card">
        {drafts.map((d) => (
          <div className="row" key={d.id}>
            <div className="row__main">
              <div className="row__t">{d.title}</div>
              <div className="row__s">updated {new Date(d.updated_at).toLocaleDateString()}</div>
            </div>
            <a className="btn btn--ghost btn--sm" href={`/admin/studio/${d.id}`}>
              Open
            </a>
          </div>
        ))}
        {drafts.length === 0 && <p className="note">No drafts yet — start one below.</p>}
        <div className="qa">
          <NewDraftButton />
        </div>
      </div>
    </>
  );
}
