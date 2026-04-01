CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_name TEXT NOT NULL,
  rider_phone TEXT NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert" ON push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read" ON push_subscriptions FOR SELECT USING (true);
