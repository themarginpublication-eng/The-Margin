import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import StudioEditor from '../StudioEditor';

export default async function StudioDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');
  const { id } = await params;
  return <StudioEditor id={id} />;
}
