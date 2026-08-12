import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { listEssays } from '@/lib/repo';
import NewEssayButton from './NewEssayButton';

export default async function EssaysHome() {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');

  const essays = await listEssays();

  return (
    <div className="admin">
      <h1>Essays</h1>
      <p className="admin__lede">The biweekly long-form article — separate from daily series readings.</p>
      <div className="admin__nav">
        <a href="/admin">← Admin home</a>
      </div>

      <div className="admin-group">
        <h2>All essays</h2>
        <ul className="admin-list">
          {essays.map((e) => (
            <li key={e.id}>
              <a href={`/admin/essays/${e.id}`}>
                <span className="admin-list__title">
                  {e.title} {e.status === 'draft' && <span className="admin-block__flag">draft</span>}
                  {e.archived_at && <span className="admin-block__flag">archived</span>}
                </span>
                <span className="admin-list__meta">{e.passage_ref || e.topic || 'untitled topic'} →</span>
              </a>
            </li>
          ))}
          {essays.length === 0 && <p className="admin__lede">No essays yet.</p>}
        </ul>
        <NewEssayButton />
      </div>
    </div>
  );
}
