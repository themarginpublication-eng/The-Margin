import Stripe from 'stripe';
import { getEnv } from './db';

export function getStripe(): Stripe {
  const key = getEnv().STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set.');
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
}
