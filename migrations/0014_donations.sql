-- Stripe-backed one-time and recurring gifts (site/give.html ->
-- POST /api/give/checkout -> Stripe Checkout -> webhook writes here).

CREATE TABLE IF NOT EXISTS donations (
  id                          TEXT PRIMARY KEY,
  email                       TEXT NOT NULL,
  name                        TEXT,
  amount_cents                INTEGER NOT NULL,
  currency                    TEXT NOT NULL DEFAULT 'usd',
  frequency                   TEXT NOT NULL DEFAULT 'one_time',
  status                      TEXT NOT NULL DEFAULT 'pending',
  source                      TEXT NOT NULL DEFAULT 'checkout',
  memo                        TEXT,
  stripe_customer_id          TEXT,
  stripe_checkout_session_id  TEXT,
  stripe_subscription_id      TEXT,
  stripe_invoice_id           TEXT,
  created_at                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_donations_email ON donations(email);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_checkout_session ON donations(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_invoice ON donations(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;

ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
