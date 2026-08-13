import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { deleteSubscriber, updateSubscriber } from '@/lib/repo';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as {
    email?: string;
    name?: string | null;
    tags?: string | null;
    notes?: string | null;
    status?: 'active' | 'unsubscribed';
  } | null;
  if (!body) return NextResponse.json({ error: 'Expected JSON body.' }, { status: 400 });
  if (body.email !== undefined && !body.email.trim()) return NextResponse.json({ error: 'Email cannot be blank.' }, { status: 400 });

  const subscriber = await updateSubscriber(id, body);
  if (!subscriber) return NextResponse.json({ error: 'Subscriber not found.' }, { status: 404 });
  return NextResponse.json({ subscriber });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  const { id } = await params;
  await deleteSubscriber(id);
  return NextResponse.json({ ok: true });
}
