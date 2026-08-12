import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { deleteEssay, getEssayById, updateEssay } from '@/lib/repo';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  const { id } = await params;
  const essay = await getEssayById(id);
  if (!essay) return NextResponse.json({ error: 'Essay not found.' }, { status: 404 });
  return NextResponse.json({ essay });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Expected JSON body.' }, { status: 400 });

  const essay = await updateEssay(id, body);
  if (!essay) return NextResponse.json({ error: 'Essay not found.' }, { status: 404 });
  return NextResponse.json({ essay });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  const { id } = await params;
  await deleteEssay(id);
  return NextResponse.json({ ok: true });
}
