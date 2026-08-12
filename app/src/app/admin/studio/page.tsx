import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { listStudioDrafts } from '@/lib/repo';
import NewDraftButton from './NewDraftButton';

export default async function StudioHome() {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');

  const drafts = await listStudioDrafts(admin.id);

  return (
    <div className="admin">
      <h1>Studio</h1>
      <p className="admin__lede">Turn a seed into a sectioned, multi-day series before it ever reaches the template library.</p>
      <div className="admin__nav">
        <a href="/admin">← Admin home</a>
      </div>

      <div className="admin-group">
        <h2>Drafts</h2>
        <ul className="admin-list">
          {drafts.map((d) => (
            <li key={d.id}>
              <a href={`/admin/studio/${d.id}`}>
                <span className="admin-list__title">{d.title}</span>
                <span className="admin-list__meta">updated {new Date(d.updated_at).toLocaleDateString()} →</span>
              </a>
            </li>
          ))}
          {drafts.length === 0 && <p className="admin__lede">No drafts yet — start one below.</p>}
        </ul>
        <NewDraftButton />
      </div>
    </div>
  );
}
