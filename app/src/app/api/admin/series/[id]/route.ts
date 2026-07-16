import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getSeriesById, updateSeries, SeriesDay } from '@/lib/repo';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  const series = await getSeriesById(id);
  if (!series) return NextResponse.json({ error: 'Series not found.' }, { status: 404 });
  return NextResponse.json({ series });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  const existing = await getSeriesById(id);
  if (!existing) return NextResponse.json({ error: 'Series not found.' }, { status: 404 });

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    subtitle?: string | null;
    passage?: string | null;
    days_json?: string;
  } | null;
  if (!body) return NextResponse.json({ error: 'Expected JSON body.' }, { status: 400 });

  let days_json: string | undefined;
  let total_days: number | undefined;
  if (body.days_json !== undefined) {
    let parsed: SeriesDay[];
    try {
      parsed = JSON.parse(body.days_json);
    } catch {
      return NextResponse.json({ error: 'days_json is not valid JSON.' }, { status: 400 });
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ error: 'days_json must be a non-empty array.' }, { status: 400 });
    }
    days_json = JSON.stringify(parsed);
    total_days = parsed.length;
  }

  const updated = await updateSeries(id, {
    title: body.title,
    subtitle: body.subtitle,
    passage: body.passage,
    days_json,
    total_days,
  });
  return NextResponse.json({ series: updated });
}
