ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS cancelled_by text;
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS cancel_reason text;
