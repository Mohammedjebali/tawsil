-- Make rider_name and rider_phone nullable so customers can subscribe for push notifications
-- Previously these were NOT NULL, which silently blocked all customer push subscriptions
ALTER TABLE push_subscriptions ALTER COLUMN rider_name DROP NOT NULL;
ALTER TABLE push_subscriptions ALTER COLUMN rider_phone DROP NOT NULL;

-- Add unique constraint to prevent duplicate subscriptions per customer phone
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_customer_phone_key
  ON push_subscriptions (customer_phone)
  WHERE customer_phone IS NOT NULL;
