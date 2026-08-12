import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getEnv } from '@/lib/db';

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const env = getEnv();
  if (!env.MAILER_URL || !env.MAILER_INTERNAL_KEY) {
    return NextResponse.json({ error: 'Mailer is not configured.' }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as {
    subject?: string;
    bodyHtml?: string;
    recipientFilter?: string;
    customEmails?: string[];
    scheduledAt?: string;
  } | null;

  if (!body?.subject || !body.bodyHtml || !body.recipientFilter) {
    return NextResponse.json({ error: 'subject, bodyHtml, and recipientFilter are required.' }, { status: 400 });
  }

  try {
    const res = await fetch(`${env.MAILER_URL}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-trigger-key': env.MAILER_INTERNAL_KEY },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) return NextResponse.json({ error: (json as { message?: string })?.message || 'Mailer rejected the request.' }, { status: 502 });
    return NextResponse.json(json);
  } catch (err) {
    console.error('broadcast send failed', err);
    return NextResponse.json({ error: 'Could not reach the mailer.' }, { status: 502 });
  }
}
