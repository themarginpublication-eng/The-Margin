import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { completeDay, getDefaultSeries } from '@/lib/repo';

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const day = Number(body?.day);
  if (!Number.isInteger(day) || day < 1) {
    return NextResponse.json({ error: 'Invalid day.' }, { status: 400 });
  }

  const series = await getDefaultSeries();
  if (!series) return NextResponse.json({ error: 'No series configured.' }, { status: 404 });
  if (day > series.total_days) return NextResponse.json({ error: 'Day out of range.' }, { status: 400 });

  const progress = await completeDay(userId, series.id, day, series.total_days);
  const completedDays: number[] = JSON.parse(progress.completed_days);

  return NextResponse.json({
    seriesId: series.id,
    totalDays: series.total_days,
    currentDay: progress.current_day,
    completedDays,
    percent: Math.round((completedDays.length / series.total_days) * 100),
  });
}
