-- Add rider live location columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_lat double precision;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_lng double precision;

-- Enable realtime on orders table (if not already)
ALTER TABLE orders REPLICA IDENTITY FULL;
