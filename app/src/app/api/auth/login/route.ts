import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, setSessionCookie, verifyPassword } from '@/lib/auth';
import { findUserByLoginId } from '@/lib/repo';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!id || !password) {
    return NextResponse.json({ error: 'Enter your username and password.' }, { status: 400 });
  }

  const user = await findUserByLoginId(id);
  if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json(
      { error: 'We couldn’t find that login. Check your details, or create an account.' },
      { status: 401 }
    );
  }

  const token = await createSessionToken(user.id);
  await setSessionCookie(token);

  return NextResponse.json({ ok: true, user: { id: user.id, name: user.name } });
}
