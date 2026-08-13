import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createSeries, listSeries } from '@/lib/repo';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const series = await listSeries();
  return NextResponse.json({
    series: series.map((s) => ({ id: s.id, slug: s.slug, title: s.title, subtitle: s.subtitle, totalDays: s.total_days })),
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { title?: string } | null;
  const title = body?.title?.trim() || 'Untitled series';
  const series = await createSeries(title);
  return NextResponse.json({ series });
}
