import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createStudioDraft, listStudioDrafts } from '@/lib/repo';
import { SEED_STATE, blankState } from '@/lib/studio-data';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const drafts = await listStudioDrafts(admin.id);
  return NextResponse.json({ drafts });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { title?: string; worked?: boolean } | null;
  const title = body?.title?.trim() || 'Untitled series';
  const state = body?.worked ? { ...SEED_STATE, title } : blankState(title);

  const draft = await createStudioDraft(admin.id, title, JSON.stringify(state));
  return NextResponse.json({ draft });
}
