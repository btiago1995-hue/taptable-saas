-- Loyalty Program Migration
-- Creates loyalty_customers table, increment_loyalty_stars RPC,
-- and adds loyalty config columns to restaurants
-- Apply via Supabase Dashboard SQL Editor

-- 1. Loyalty customers table
CREATE TABLE IF NOT EXISTS loyalty_customers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  phone_number  text NOT NULL,
  name          text NOT NULL DEFAULT '',
  stars         int  NOT NULL DEFAULT 0,
  total_redeemed int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_restaurant ON loyalty_customers (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_phone      ON loyalty_customers (phone_number);

-- RLS
ALTER TABLE loyalty_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_customers_own"
  ON loyalty_customers FOR ALL
  USING (
    restaurant_id IN (SELECT restaurant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "loyalty_customers_anon_upsert"
  ON loyalty_customers FOR INSERT
  WITH CHECK (true);

-- 2. Add loyalty config to restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS loyalty_active              boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS loyalty_stars_threshold     int     NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS loyalty_reward_description  text    NOT NULL DEFAULT 'Refeição grátis por conta da casa';

-- 3. RPC: increment_loyalty_stars (upsert + increment)
CREATE OR REPLACE FUNCTION increment_loyalty_stars(
  p_restaurant_id uuid,
  p_phone_number  text,
  p_name          text DEFAULT '',
  p_stars_to_add  int  DEFAULT 1
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO loyalty_customers (restaurant_id, phone_number, name, stars)
  VALUES (p_restaurant_id, p_phone_number, p_name, p_stars_to_add)
  ON CONFLICT (restaurant_id, phone_number) DO UPDATE
    SET stars      = loyalty_customers.stars + p_stars_to_add,
        name       = CASE WHEN p_name != '' THEN p_name ELSE loyalty_customers.name END,
        updated_at = now();
END;
$$;

-- 4. RPC: redeem_loyalty_reward (reset stars after redemption)
CREATE OR REPLACE FUNCTION redeem_loyalty_reward(
  p_restaurant_id uuid,
  p_phone_number  text
)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_threshold int;
  v_stars     int;
BEGIN
  SELECT loyalty_stars_threshold INTO v_threshold
  FROM restaurants WHERE id = p_restaurant_id;

  SELECT stars INTO v_stars
  FROM loyalty_customers
  WHERE restaurant_id = p_restaurant_id AND phone_number = p_phone_number;

  IF v_stars IS NULL OR v_stars < v_threshold THEN
    RETURN -1; -- not enough stars
  END IF;

  UPDATE loyalty_customers
  SET stars          = stars - v_threshold,
      total_redeemed = total_redeemed + 1,
      updated_at     = now()
  WHERE restaurant_id = p_restaurant_id AND phone_number = p_phone_number;

  RETURN 1; -- success
END;
$$;
