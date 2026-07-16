import { getEnv } from './db';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
}

function requireGoogleConfig() {
  const env = getEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new Error(
      'Google sign-in is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI (wrangler secret put ...).'
    );
  }
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
  };
}

export function buildGoogleAuthUrl(state: string): string {
  const { clientId, redirectUri } = requireGoogleConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const { clientId, clientSecret, redirectUri } = requireGoogleConfig();

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Google token exchange failed: ${await tokenRes.text()}`);
  }
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const profileRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!profileRes.ok) {
    throw new Error(`Google userinfo request failed: ${await profileRes.text()}`);
  }
  return (await profileRes.json()) as GoogleProfile;
}
