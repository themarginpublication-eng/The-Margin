import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getEnv } from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import {
  createDonation,
  findDonationByCheckoutSession,
  findDonationByInvoice,
  setUserStripeCustomerId,
} from '@/lib/repo';

async function notifyThankYou(email: string, name: string | undefined, amountCents: number, frequency: string) {
  const env = getEnv();
  if (!env.MAILER_URL || !env.MAILER_INTERNAL_KEY) return;
  try {
    await fetch(`${env.MAILER_URL}/give-thankyou`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-trigger-key': env.MAILER_INTERNAL_KEY },
      body: JSON.stringify({ email, name, amountCents, frequency }),
    });
  } catch (err) {
    console.error('give-thankyou notify failed', err);
  }
}

export async function POST(req: NextRequest) {
  const env = getEnv();
  if (!env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 });

  const signature = req.headers.get('stripe-signature');
  const payload = await req.text();
  if (!signature) return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== 'paid') break;
        if (await findDonationByCheckoutSession(session.id)) break;

        const email = (session.customer_details?.email || session.metadata?.email || '').toLowerCase();
        if (!email) break;
        const name = session.metadata?.name || session.customer_details?.name || null;
        const frequency = session.mode === 'subscription' ? 'monthly' : 'one_time';
        const amountCents = session.amount_total ?? 0;

        await createDonation({
          email,
          name,
          amount_cents: amountCents,
          currency: session.currency || 'usd',
          frequency,
          status: 'succeeded',
          source: 'checkout',
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
          stripe_checkout_session_id: session.id,
          stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
          stripe_invoice_id: null,
        });

        if (typeof session.customer === 'string') {
          await setUserStripeCustomerId(email, session.customer).catch(() => {});
        }
        await notifyThankYou(email, name || undefined, amountCents, frequency);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        // The first invoice on a new subscription is already recorded via
        // checkout.session.completed — only record renewals here.
        if (invoice.billing_reason !== 'subscription_cycle') break;
        if (await findDonationByInvoice(invoice.id!)) break;

        const email = (invoice.customer_email || '').toLowerCase();
        if (!email) break;

        await createDonation({
          email,
          name: null,
          amount_cents: invoice.amount_paid ?? 0,
          currency: invoice.currency || 'usd',
          frequency: 'monthly',
          status: 'succeeded',
          source: 'subscription_renewal',
          stripe_customer_id: typeof invoice.customer === 'string' ? invoice.customer : null,
          stripe_subscription_id:
            typeof (invoice as unknown as { subscription?: string | null }).subscription === 'string'
              ? (invoice as unknown as { subscription: string }).subscription
              : null,
          stripe_checkout_session_id: null,
          stripe_invoice_id: invoice.id!,
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('Stripe webhook handler error', err);
    return NextResponse.json({ error: 'Webhook handler error.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
