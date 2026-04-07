-- ============================================================
-- 010_stores_marketplace.sql
-- Marketplace tables: stores, store_categories, store_items, store_orders
-- ============================================================

-- 1. stores — restaurant / shop profiles
CREATE TABLE IF NOT EXISTS stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID REFERENCES auth.users(id),
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT DEFAULT 'restaurant',
  phone       TEXT,
  address     TEXT,
  lat         FLOAT8,
  lng         FLOAT8,
  logo_url    TEXT,
  cover_url   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  is_approved BOOLEAN DEFAULT FALSE,
  rating      FLOAT8  DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  opening_time TIME,
  closing_time TIME,
  delivery_fee INTEGER DEFAULT 1500   -- millimes (1.500 DT)
);

CREATE INDEX IF NOT EXISTS idx_stores_owner   ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_category ON stores(category);
CREATE INDEX IF NOT EXISTS idx_stores_active   ON stores(is_active, is_approved);

-- 2. store_categories — menu sections inside a store
CREATE TABLE IF NOT EXISTS store_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_store_categories_store ON store_categories(store_id);

-- 3. store_items — products / dishes
CREATE TABLE IF NOT EXISTS store_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id  UUID REFERENCES store_categories(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  price        INTEGER NOT NULL,          -- millimes
  image_url    TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_items_store    ON store_items(store_id);
CREATE INDEX IF NOT EXISTS idx_store_items_category ON store_items(category_id);

-- 4. store_orders — links an order to a store with item details
CREATE TABLE IF NOT EXISTS store_orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id           UUID NOT NULL REFERENCES stores(id),
  items              JSONB NOT NULL DEFAULT '[]',   -- [{item_id, name, price, quantity}]
  subtotal           INTEGER DEFAULT 0,             -- millimes
  status             TEXT DEFAULT 'pending',         -- pending, confirmed, preparing, ready, picked_up
  store_confirmed_at TIMESTAMPTZ,
  store_ready_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_store_orders_order ON store_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_store ON store_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON store_orders(status);

-- 5. Storage bucket for store images (logo, cover, item images)
INSERT INTO storage.buckets (id, name, public) VALUES ('store-images', 'store-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "store_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-images');

-- Allow authenticated users to upload
CREATE POLICY "store_images_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'store-images' AND auth.role() = 'authenticated');

-- Allow owners to update/delete their uploads
CREATE POLICY "store_images_auth_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'store-images' AND auth.role() = 'authenticated');

CREATE POLICY "store_images_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'store-images' AND auth.role() = 'authenticated');
