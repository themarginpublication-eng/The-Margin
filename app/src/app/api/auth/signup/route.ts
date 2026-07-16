import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, hashPassword, setSessionCookie } from '@/lib/auth';
import { createUserWithPassword, findUserByEmail, findUserByUsername } from '@/lib/repo';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!name) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
  if (username.length < 3) return NextResponse.json({ error: 'Username needs at least 3 characters.' }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: 'Password needs at least 6 characters.' }, { status: 400 });

  if (await findUserByUsername(username)) {
    return NextResponse.json({ error: 'That username is taken.' }, { status: 409 });
  }
  if (await findUserByEmail(email)) {
    return NextResponse.json({ error: 'That email already has an account.' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await createUserWithPassword({ name, email, username, passwordHash });

  const token = await createSessionToken(user.id);
  await setSessionCookie(token);

  return NextResponse.json({ ok: true, user: { id: user.id, name: user.name } });
}
