import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import SeriesEditor from './SeriesEditor';

export default async function AdminSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');
  const { id } = await params;
  return <SeriesEditor id={id} />;
}
