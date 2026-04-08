-- Store owners table (phone-based auth, like riders)
CREATE TABLE IF NOT EXISTS store_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Drop FK constraint on stores.owner_id if it exists (was pointing to auth.users)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'stores' 
      AND kcu.column_name = 'owner_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE stores DROP CONSTRAINT stores_owner_id_fkey;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE store_owners ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON store_owners
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
