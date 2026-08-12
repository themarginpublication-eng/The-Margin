import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { deleteStudioDraft, getStudioDraft, updateStudioDraft } from '@/lib/repo';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  const draft = await getStudioDraft(id);
  if (!draft || draft.user_id !== admin.id) return NextResponse.json({ error: 'Draft not found.' }, { status: 404 });
  return NextResponse.json({ draft });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  const existing = await getStudioDraft(id);
  if (!existing || existing.user_id !== admin.id) return NextResponse.json({ error: 'Draft not found.' }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { title?: string; data?: unknown } | null;
  if (!body || body.data === undefined) return NextResponse.json({ error: 'Expected { title, data }.' }, { status: 400 });

  const title = body.title?.trim() || existing.title;
  const draft = await updateStudioDraft(id, title, JSON.stringify(body.data));
  return NextResponse.json({ draft });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  const existing = await getStudioDraft(id);
  if (!existing || existing.user_id !== admin.id) return NextResponse.json({ error: 'Draft not found.' }, { status: 404 });

  await deleteStudioDraft(id);
  return NextResponse.json({ ok: true });
}
