import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { listSeries } from '@/lib/repo';
import NotesEditor from './NotesEditor';

export default async function NotesHome({ searchParams }: { searchParams: Promise<{ series?: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');

  const [series, params] = await Promise.all([listSeries(), searchParams]);

  return (
    <>
      <p className="crumb">Content</p>
      <h1>Daily notes</h1>
      <p className="sub">The day-by-day queue for each series. Empty days are flagged before they&rsquo;re due.</p>
      {series.length === 0 ? (
        <p className="note">No series yet — create one first.</p>
      ) : (
        <NotesEditor
          seriesOptions={series.map((s) => ({ id: s.id, title: s.title }))}
          initialSeriesId={params.series || series[0].id}
        />
      )}
    </>
  );
}
