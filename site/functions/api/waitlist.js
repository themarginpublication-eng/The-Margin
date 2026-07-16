// Cloudflare Pages Function — POST /api/waitlist
// Backs the launch popup and subscribe forms in site.js. Stores the email
// in the shared D1 database (binding: DB) and, if a Sender.net API key is
// configured, adds the subscriber there too so campaigns can reach them.

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return Response.json({ error: 'Expected JSON body.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const source = typeof body.source === 'string' ? body.source.slice(0, 64) : 'site';

  if (!isValidEmail(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(
      'INSERT INTO waitlist (id, email, source) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING'
    ).bind(id, email, source).run();
  } catch (err) {
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }

  // Optional: forward to Sender.net so the email platform stays the source
  // of truth for campaigns. Configure SENDER_API_KEY + SENDER_GROUP_ID as
  // Pages environment variables/secrets to enable this.
  if (env.SENDER_API_KEY && env.SENDER_GROUP_ID) {
    try {
      await fetch('https://api.sender.net/v2/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.SENDER_API_KEY}`,
        },
        body: JSON.stringify({ email, groups: [env.SENDER_GROUP_ID] }),
      });
    } catch (err) {
      // Non-fatal: the waitlist row is already saved in D1.
    }
  }

  return Response.json({ ok: true });
}
