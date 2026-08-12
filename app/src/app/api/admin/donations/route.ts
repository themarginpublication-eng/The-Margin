import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { listDonations } from '@/lib/repo';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  return NextResponse.json({ donations: await listDonations() });
}
