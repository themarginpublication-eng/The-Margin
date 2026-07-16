import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getSeriesById, SeriesDay } from '@/lib/repo';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; n: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { id, n } = await params;
  const dayNum = Number(n);
  if (!Number.isInteger(dayNum) || dayNum < 1) {
    return NextResponse.json({ error: 'Invalid day.' }, { status: 400 });
  }

  const series = await getSeriesById(id);
  if (!series) return NextResponse.json({ error: 'Series not found.' }, { status: 404 });

  const days: SeriesDay[] = JSON.parse(series.days_json);
  const day = days.find((d) => d.day === dayNum);
  if (!day) return NextResponse.json({ error: 'Day not found.' }, { status: 404 });

  return NextResponse.json({ series: { id: series.id, title: series.title, totalDays: series.total_days }, day });
}
