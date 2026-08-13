import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import AdminSidebar from './AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect('/login');

  return (
    <div className="admin-shell">
      <AdminSidebar adminEmail={admin.email} />
      <main className="main">{children}</main>
    </div>
  );
}
