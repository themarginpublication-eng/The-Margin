import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getDefaultSeries, getOrCreateProgress } from '@/lib/repo';

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const series = await getDefaultSeries();
  if (!series) return NextResponse.json({ error: 'No series configured.' }, { status: 404 });

  const progress = await getOrCreateProgress(userId, series.id);
  const completedDays: number[] = JSON.parse(progress.completed_days);

  return NextResponse.json({
    seriesId: series.id,
    totalDays: series.total_days,
    currentDay: progress.current_day,
    completedDays,
    percent: Math.round((completedDays.length / series.total_days) * 100),
  });
}
