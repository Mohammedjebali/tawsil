-- Tawsil Database Schema
-- Run this in your Supabase SQL editor

-- Stores table
CREATE TABLE stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other', -- restaurant, supermarket, pharmacy, shop, other
  address TEXT,
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  
  -- Customer info
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_lat DECIMAL(10, 7),
  customer_lng DECIMAL(10, 7),
  
  -- Store info
  store_id UUID REFERENCES stores(id),
  store_name TEXT NOT NULL, -- denormalized in case store is deleted
  store_address TEXT,
  store_lat DECIMAL(10, 7),
  store_lng DECIMAL(10, 7),
  
  -- Order details
  items_description TEXT NOT NULL, -- free text: what the customer wants
  estimated_amount DECIMAL(10, 3), -- customer's estimate of items cost (optional)
  
  -- Delivery fee
  distance_km DECIMAL(5, 2),
  delivery_fee INTEGER NOT NULL DEFAULT 2000, -- in millimes
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, picked_up, waiting_customer, delivered, cancelled
  
  -- Rider
  rider_id UUID REFERENCES auth.users(id),
  rider_name TEXT,
  rider_phone TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  waiting_customer_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'TW-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

-- Enable Realtime for orders
ALTER TABLE orders REPLICA IDENTITY FULL;

-- RLS Policies
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Anyone can read active stores
CREATE POLICY "Public can view stores" ON stores
  FOR SELECT USING (is_active = true);

-- Anyone can create orders
CREATE POLICY "Anyone can create orders" ON orders
  FOR INSERT WITH CHECK (true);

-- Anyone can view orders (by order number for customer tracking)
CREATE POLICY "Anyone can view orders" ON orders
  FOR SELECT USING (true);

-- Authenticated users (riders) can update orders
CREATE POLICY "Riders can update orders" ON orders
  FOR UPDATE USING (auth.uid() IS NOT NULL);

