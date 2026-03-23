-- Multi-Store Migration
-- Permite que um utilizador (manager) aceda a múltiplos restaurantes
-- Apply via Supabase Dashboard SQL Editor

-- 1. Tabela de acesso por utilizador/restaurante
CREATE TABLE IF NOT EXISTS user_restaurant_access (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_ura_user       ON user_restaurant_access (user_id);
CREATE INDEX IF NOT EXISTS idx_ura_restaurant ON user_restaurant_access (restaurant_id);

-- RLS
ALTER TABLE user_restaurant_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own restaurant access"
  ON user_restaurant_access FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage restaurant access"
  ON user_restaurant_access FOR ALL
  USING (true) WITH CHECK (true);

-- 2. Backfill — ligar todos os utilizadores existentes ao seu restaurante actual
INSERT INTO user_restaurant_access (user_id, restaurant_id)
SELECT id, restaurant_id
FROM users
WHERE restaurant_id IS NOT NULL
ON CONFLICT (user_id, restaurant_id) DO NOTHING;
