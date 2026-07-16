import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { listSeries } from '@/lib/repo';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const series = await listSeries();
  return NextResponse.json({
    series: series.map((s) => ({ id: s.id, slug: s.slug, title: s.title, subtitle: s.subtitle, totalDays: s.total_days })),
  });
}
