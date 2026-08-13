import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { listSeries } from '@/lib/repo';
import SeriesList from './SeriesList';

export default async function SeriesHome() {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');

  const series = await listSeries();

  return (
    <>
      <p className="crumb">Content</p>
      <h1>Series</h1>
      <p className="sub">Add, retire, or open a series. Everything a reader sees lives in its editor.</p>
      <SeriesList
        series={series.map((s) => ({
          id: s.id,
          title: s.title,
          subtitle: s.subtitle,
          total_days: s.total_days,
          kind: s.kind,
          status: s.status,
        }))}
      />
    </>
  );
}
