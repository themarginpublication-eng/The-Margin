import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { listEmailTemplates, upsertEmailTemplate } from '@/lib/repo';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  return NextResponse.json({ templates: await listEmailTemplates() });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { key?: string; subject?: string; intro_html?: string } | null;
  if (!body?.key) return NextResponse.json({ error: 'key is required.' }, { status: 400 });

  await upsertEmailTemplate(body.key, body.subject || '', body.intro_html || '');
  return NextResponse.json({ ok: true });
}
