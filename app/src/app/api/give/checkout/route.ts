import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    amountCents?: number;
    frequency?: string;
    email?: string;
    name?: string;
  } | null;

  const amountCents = Math.round(Number(body?.amountCents));
  const frequency = body?.frequency === 'monthly' ? 'monthly' : 'one_time';
  const email = (body?.email || '').trim();
  const name = (body?.name || '').trim();

  if (!Number.isFinite(amountCents) || amountCents < 100) {
    return NextResponse.json({ error: 'Enter an amount of at least $1.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
  }

  const origin = req.headers.get('origin') || new URL(req.url).origin;
  const siteOrigin = origin.includes('app.') ? origin.replace('app.', '') : 'https://readthemargin.net';

  try {
    const stripe = getStripe();
    const productName = frequency === 'monthly' ? 'Monthly gift to The Margin' : 'One-time gift to The Margin';

    const session = await stripe.checkout.sessions.create({
      mode: frequency === 'monthly' ? 'subscription' : 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: productName },
            unit_amount: amountCents,
            ...(frequency === 'monthly' ? { recurring: { interval: 'month' as const } } : {}),
          },
          quantity: 1,
        },
      ],
      metadata: { email, name, frequency },
      subscription_data: frequency === 'monthly' ? { metadata: { email, name, frequency } } : undefined,
      success_url: `${siteOrigin}/give.html?success=1`,
      cancel_url: `${siteOrigin}/give.html?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('give/checkout failed', err);
    return NextResponse.json({ error: 'Could not start checkout — please try again.' }, { status: 500 });
  }
}
