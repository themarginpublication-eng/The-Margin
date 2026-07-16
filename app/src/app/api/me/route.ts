import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { findUserById, getDefaultSeries } from '@/lib/repo';

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const user = await findUserById(userId);
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const series = await getDefaultSeries();

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    emailVerified: !!user.email_verified,
    series: series ? { id: series.id, title: series.title, subtitle: series.subtitle, totalDays: series.total_days } : null,
  });
}
