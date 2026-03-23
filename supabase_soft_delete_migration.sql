-- ─── Soft Deletes ────────────────────────────────────────────────────────────
-- Adiciona deleted_at às tabelas principais.
-- Em vez de DELETE, usar UPDATE SET deleted_at = now().
-- RLS policies filtram automaticamente registos soft-deleted.
-- Aplicar via Supabase Dashboard → SQL Editor

-- 1. Adicionar coluna deleted_at
ALTER TABLE restaurants  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE users        ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE menu_items   ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 2. Índices para filtrar soft-deleted (NULL = activo)
CREATE INDEX IF NOT EXISTS idx_restaurants_active   ON restaurants  (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_active         ON users        (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_menu_items_active    ON menu_items   (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_menu_categories_active ON menu_categories (id) WHERE deleted_at IS NULL;

-- 3. Atualizar RLS — filtrar deleted em leituras públicas
-- (Ajustar nomes das policies conforme as existentes no teu projecto)

-- Restaurants: apenas activos visíveis via RLS pública
-- Exemplo de policy (adaptar ao nome real existente):
--
-- DROP POLICY IF EXISTS "restaurants_public_read" ON restaurants;
-- CREATE POLICY "restaurants_public_read" ON restaurants
--   FOR SELECT USING (deleted_at IS NULL);

-- 4. View helper: restaurantes activos (opcional — uso em queries de superadmin)
CREATE OR REPLACE VIEW active_restaurants AS
  SELECT * FROM restaurants WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_users AS
  SELECT * FROM users WHERE deleted_at IS NULL;

-- 5. Função RPC para soft-delete de restaurante (para API routes)
CREATE OR REPLACE FUNCTION soft_delete_restaurant(p_restaurant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE restaurants SET deleted_at = now() WHERE id = p_restaurant_id;
  UPDATE users        SET deleted_at = now() WHERE restaurant_id = p_restaurant_id;
END;
$$;

COMMENT ON COLUMN restaurants.deleted_at    IS 'NULL = activo. Preenchido em vez de DELETE.';
COMMENT ON COLUMN users.deleted_at          IS 'NULL = activo. Preenchido em vez de DELETE.';
COMMENT ON COLUMN menu_items.deleted_at     IS 'NULL = activo. Preenchido em vez de DELETE.';
COMMENT ON COLUMN menu_categories.deleted_at IS 'NULL = activo. Preenchido em vez de DELETE.';
