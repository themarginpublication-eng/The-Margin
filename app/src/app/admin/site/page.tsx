import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import SiteContentEditor from './SiteContentEditor';

export default async function AdminSitePage() {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');
  return <SiteContentEditor />;
}
