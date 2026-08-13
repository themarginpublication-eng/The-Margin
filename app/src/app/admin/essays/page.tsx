import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { listEssays } from '@/lib/repo';
import NewEssayButton from './NewEssayButton';

export default async function EssaysHome() {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');

  const essays = await listEssays();

  return (
    <>
      <p className="crumb">Content</p>
      <h1>Essays</h1>
      <p className="sub">The biweekly long-form article — separate from daily series readings.</p>

      <div className="card">
        <div className="toolbar">
          <span className="spacer" />
          <NewEssayButton />
        </div>
        {essays.map((e) => (
          <div className="row" key={e.id}>
            <span className={`badge${e.status === 'published' ? ' badge--live' : ' badge--draft'}`}>
              {e.archived_at ? 'archived' : e.status}
            </span>
            <div className="row__main">
              <div className="row__t">{e.title}</div>
              <div className="row__s">{e.passage_ref || e.topic || 'untitled topic'}</div>
            </div>
            <a className="btn btn--ghost btn--sm" href={`/admin/essays/${e.id}`}>
              Edit
            </a>
          </div>
        ))}
        {essays.length === 0 && <p className="note">No essays yet.</p>}
      </div>
    </>
  );
}
