import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import EssayEditor from './EssayEditor';

export default async function EssayPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');
  const { id } = await params;
  return <EssayEditor id={id} />;
}
