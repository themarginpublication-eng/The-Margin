import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, setSessionCookie } from '@/lib/auth';
import { exchangeGoogleCode } from '@/lib/google';
import { findOrCreateGoogleUser } from '@/lib/repo';

const STATE_COOKIE = 'tm_oauth_state';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = req.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL('/login?error=google_state', url.origin));
  }

  try {
    const profile = await exchangeGoogleCode(code);
    const user = await findOrCreateGoogleUser({
      sub: profile.sub,
      email: profile.email,
      name: profile.name,
      emailVerified: profile.email_verified,
    });

    const token = await createSessionToken(user.id);
    await setSessionCookie(token);

    const res = NextResponse.redirect(new URL('/dashboard', url.origin));
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (err) {
    console.error('Google OAuth callback failed', err);
    return NextResponse.redirect(new URL('/login?error=google_failed', url.origin));
  }
}
