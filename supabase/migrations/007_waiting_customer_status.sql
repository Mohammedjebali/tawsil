-- Add waiting_customer_at timestamp to orders (supports the new "waiting for customer" status)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiting_customer_at TIMESTAMPTZ;

-- Add customer_phone to push_subscriptions so customers can receive notifications
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS customer_phone TEXT;
