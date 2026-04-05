-- Points history: tracks every point transaction
CREATE TABLE points_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,            -- positive = earned, negative = redeemed
  reason TEXT NOT NULL,              -- 'order', 'referral', 'referral_bonus', 'redemption'
  reference_id TEXT,                 -- order number, referral code, redemption id, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_points_history_customer ON points_history(customer_id);
CREATE INDEX idx_points_history_created ON points_history(created_at DESC);

-- Redemptions: tracks reward claims
CREATE TABLE redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tier INTEGER NOT NULL,             -- 100 or 200
  label TEXT NOT NULL,               -- e.g. 'Sim recharge 5 DT'
  points_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, fulfilled, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_redemptions_customer ON redemptions(customer_id);

-- RLS
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on points_history" ON points_history
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on redemptions" ON redemptions
  FOR ALL USING (true) WITH CHECK (true);
