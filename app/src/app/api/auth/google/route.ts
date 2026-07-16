import { NextResponse } from 'next/server';
import { buildGoogleAuthUrl } from '@/lib/google';

const STATE_COOKIE = 'tm_oauth_state';

export async function GET() {
  const state = crypto.randomUUID();
  let url: string;
  try {
    url = buildGoogleAuthUrl(state);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 501 });
  }

  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
