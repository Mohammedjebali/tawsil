-- Rider fee payments: track service fee per delivery
CREATE TABLE IF NOT EXISTS rider_fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_phone text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  order_number text,
  store_name text,
  fee_amount integer NOT NULL DEFAULT 500, -- millimes
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rider_fee_payments_rider_phone ON rider_fee_payments(rider_phone);
CREATE INDEX IF NOT EXISTS idx_rider_fee_payments_is_paid ON rider_fee_payments(is_paid);
CREATE INDEX IF NOT EXISTS idx_rider_fee_payments_order_id ON rider_fee_payments(order_id);

-- Auto-create fee entry when an order is delivered
CREATE OR REPLACE FUNCTION auto_create_fee_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    INSERT INTO rider_fee_payments (rider_phone, order_id, order_number, store_name, fee_amount)
    VALUES (NEW.rider_phone, NEW.id, NEW.order_number, NEW.store_name, 500);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_fee_payment ON orders;
CREATE TRIGGER trg_auto_fee_payment
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_fee_payment();
