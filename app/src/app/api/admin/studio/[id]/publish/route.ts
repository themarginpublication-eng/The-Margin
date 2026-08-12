import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getStudioDraft, publishStudioDraftAsSeries } from '@/lib/repo';
import type { SeriesDay } from '@/lib/repo';
import type { StudioState } from '@/lib/studio-data';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  const draft = await getStudioDraft(id);
  if (!draft || draft.user_id !== admin.id) return NextResponse.json({ error: 'Draft not found.' }, { status: 404 });

  const state = JSON.parse(draft.data_json) as StudioState;

  let title: string;
  let subtitle: string | null;
  let passage: string | null;
  let kind: string;
  let days: SeriesDay[];

  if (state.mode === 'free') {
    if (!state.free.title.trim()) return NextResponse.json({ error: 'Give the draft a title before publishing.' }, { status: 400 });
    title = state.free.title.trim();
    subtitle = null;
    passage = null;
    kind = 'idea';
    days = state.free.days.map((d, i) => ({
      day: i + 1,
      title: d.t || `Day ${i + 1}`,
      ref: '',
      verse: '',
      move: '',
      reading: { context: d.b, closeRead: '', scholars: '', forYou: '' },
    }));
  } else {
    if (!state.title.trim()) return NextResponse.json({ error: 'Give the draft a title before publishing.' }, { status: 400 });
    if (state.days.length === 0) return NextResponse.json({ error: 'No days to publish yet.' }, { status: 400 });
    title = state.title.trim();
    subtitle = state.homiletical || null;
    passage = state.unit.start && state.unit.end ? `${state.unit.start} – ${state.unit.end}` : state.seed || null;
    kind = state.seedType;
    days = state.days.map((d, i) => {
      const obs = d.obs != null ? state.obs.find((o) => o.id === d.obs) : null;
      return {
        day: i + 1,
        title: d.hook ? d.hook.slice(0, 80) : `Day ${i + 1}`,
        ref: obs?.ref || '',
        verse: d.book,
        move: d.frame,
        reading: { context: d.hook, closeRead: d.book, scholars: d.look, forYou: d.took },
      };
    });
  }

  const series = await publishStudioDraftAsSeries(title, subtitle, passage, kind, days);
  return NextResponse.json({ series });
}
