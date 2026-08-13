import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getStudioDraft, linkStudioDraftSeries, upsertWorkspaceSeries } from '@/lib/repo';
import type { SeriesRow } from '@/lib/repo';

const KINDS: SeriesRow['kind'][] = ['book', 'person', 'passage', 'idea'];
const STATUSES: SeriesRow['status'][] = ['live', 'scheduled', 'draft', 'retired'];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  const draft = await getStudioDraft(id);
  if (!draft || draft.user_id !== admin.id) return NextResponse.json({ error: 'Draft not found.' }, { status: 404 });

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    kind?: string;
    subtitle?: string;
    status?: string;
    description?: string;
  } | null;
  if (!body || !body.name?.trim()) return NextResponse.json({ error: 'Give the series a name.' }, { status: 400 });

  const kind = KINDS.includes(body.kind as SeriesRow['kind']) ? (body.kind as SeriesRow['kind']) : 'idea';
  const status = STATUSES.includes(body.status as SeriesRow['status']) ? (body.status as SeriesRow['status']) : 'draft';

  const { series, created } = await upsertWorkspaceSeries(draft.series_id, {
    title: body.name.trim(),
    subtitle: body.subtitle?.trim() || null,
    kind,
    status,
    description: body.description?.trim() || null,
  });

  if (created) await linkStudioDraftSeries(id, series.id);
  return NextResponse.json({ series });
}
