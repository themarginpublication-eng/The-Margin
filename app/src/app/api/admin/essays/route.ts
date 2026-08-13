import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createEssay, listEssays, listEssaysForWorkspace } from '@/lib/repo';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const seriesId = req.nextUrl.searchParams.get('seriesId');
  const essays = seriesId !== null ? await listEssaysForWorkspace(seriesId || null) : await listEssays();
  return NextResponse.json({ essays });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { title?: string } | null;
  const title = body?.title?.trim() || 'Untitled essay';
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Date.now().toString(36);

  const essay = await createEssay(title, slug);
  return NextResponse.json({ essay });
}
