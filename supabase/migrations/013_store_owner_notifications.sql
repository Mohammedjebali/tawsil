-- Add store_owner_id to push_subscriptions for store owner notifications
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS store_owner_id uuid;

-- When store owner marks order "ready", update the main order status and notify riders
-- This is handled in application code
