'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const isLogin = mode === 'login';

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch(isLogin ? '/api/auth/login' : '/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(data.error || 'Something went wrong.');
        setBusy(false);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setErr('Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="authcard">
        <div className="wm">
          <span className="wm__bar"></span>
          <span className="wm__lock">
            <span className="wm__type">the margin</span>
            <span className="wm__tag">Biblical literacy · in the margins</span>
          </span>
        </div>
        <h1>{isLogin ? <>Welcome <em>back.</em></> : <>Begin your <em>reading.</em></>}</h1>
        <p className="sub">
          {isLogin ? 'Pick up your journey where you left off.' : 'Make an account and start the first morning.'}
        </p>

        <div className="tabs">
          <button type="button" className={isLogin ? 'on' : ''} onClick={() => { setMode('login'); setErr(''); }}>
            Log in
          </button>
          <button type="button" className={!isLogin ? 'on' : ''} onClick={() => { setMode('signup'); setErr(''); }}>
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="field">
              <label>Full name</label>
              <input name="name" type="text" autoComplete="name" placeholder="Mary Oliver" />
            </div>
          )}
          <div className="field">
            <label>Username</label>
            <input
              name="username"
              type="text"
              autoComplete="username"
              placeholder={isLogin ? 'username or email' : 'choose a username'}
            />
          </div>
          {!isLogin && (
            <div className="field">
              <label>Email</label>
              <input name="email" type="email" autoComplete="email" placeholder="you@email.com" />
            </div>
          )}
          <div className="field">
            <label>Password</label>
            <input
              name="password"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder={isLogin ? 'your password' : 'at least 6 characters'}
            />
          </div>
          <div className="err">{err}</div>
          <button className="btn btn--block" type="submit" disabled={busy}>
            {isLogin ? 'Log in' : 'Create account & start Day 1'}
          </button>
        </form>

        <div className="orline">or</div>
        <a className="gbtn" href="/api/auth/google">
          <svg viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
          </svg>
          Continue with Google
        </a>
        <p className="fine">
          {isLogin ? (
            <>New here? <button type="button" onClick={() => setMode('signup')}>Create an account</button></>
          ) : (
            <>Already reading? <button type="button" onClick={() => setMode('login')}>Log in</button></>
          )}
        </p>
      </div>
    </div>
  );
}
