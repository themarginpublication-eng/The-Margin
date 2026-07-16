import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getSiteContentMap, upsertSiteContent, deleteSiteContent } from '@/lib/repo';
import manifest from '@/lib/site-manifest.json';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const overrides = await getSiteContentMap(manifest.map((b) => b.key));
  const blocks = manifest.map((b) => ({ ...b, override: overrides[b.key] ?? null }));
  return NextResponse.json({ blocks });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { key?: string; value?: string | null } | null;
  const key = body?.key;
  if (!key || !manifest.some((b) => b.key === key)) {
    return NextResponse.json({ error: 'Unknown content key.' }, { status: 400 });
  }

  if (body?.value === null || body?.value === undefined || body.value === '') {
    await deleteSiteContent(key);
    return NextResponse.json({ ok: true, override: null });
  }

  await upsertSiteContent(key, body.value);
  return NextResponse.json({ ok: true, override: body.value });
}
