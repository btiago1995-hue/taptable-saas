-- =============================================================================
-- MIGRAÇÃO RLS: Blindagem Multi-Tenant — Dineo SaaS
-- Garante isolamento total de dados entre restaurantes (Silos RLS)
-- VERSÃO 2: Resistente a tabelas que ainda não existem
-- =============================================================================
-- INSTRUÇÕES: Executar no Supabase Dashboard → SQL Editor → New Query
-- É seguro executar várias vezes (idempotente)
-- =============================================================================


-- =============================================================================
-- BLOCO 0: Função helper — get_my_restaurant_id()
-- =============================================================================

CREATE OR REPLACE FUNCTION get_my_restaurant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT restaurant_id FROM users WHERE id = auth.uid() LIMIT 1;
$$;

COMMENT ON FUNCTION get_my_restaurant_id IS
  'Retorna o restaurant_id do utilizador autenticado. Usado pelas políticas RLS.';


-- =============================================================================
-- BLOCO 1: restaurants
-- =============================================================================

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "restaurants_select_own" ON restaurants;
DROP POLICY IF EXISTS "restaurants_update_own" ON restaurants;
DROP POLICY IF EXISTS "restaurants_insert_onboarding" ON restaurants;

CREATE POLICY "restaurants_select_own"
  ON restaurants FOR SELECT
  USING (
    id = get_my_restaurant_id()
    OR auth.role() = 'anon'
  );

CREATE POLICY "restaurants_update_own"
  ON restaurants FOR UPDATE
  USING (id = get_my_restaurant_id())
  WITH CHECK (id = get_my_restaurant_id());

CREATE POLICY "restaurants_insert_onboarding"
  ON restaurants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- =============================================================================
-- BLOCO 2: users
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_restaurant" ON users;
DROP POLICY IF EXISTS "users_update_own_profile" ON users;
DROP POLICY IF EXISTS "users_insert_own_restaurant" ON users;
DROP POLICY IF EXISTS "users_delete_own_restaurant" ON users;

CREATE POLICY "users_select_own_restaurant"
  ON users FOR SELECT
  USING (restaurant_id = get_my_restaurant_id());

CREATE POLICY "users_update_own_profile"
  ON users FOR UPDATE
  USING (restaurant_id = get_my_restaurant_id())
  WITH CHECK (restaurant_id = get_my_restaurant_id());

CREATE POLICY "users_insert_own_restaurant"
  ON users FOR INSERT
  WITH CHECK (
    restaurant_id = get_my_restaurant_id()
    OR (auth.uid() IS NOT NULL AND id = auth.uid())
  );

CREATE POLICY "users_delete_own_restaurant"
  ON users FOR DELETE
  USING (restaurant_id = get_my_restaurant_id());


-- =============================================================================
-- BLOCO 3: orders
-- =============================================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON orders;
DROP POLICY IF EXISTS "orders_insert_own" ON orders;
DROP POLICY IF EXISTS "orders_update_own" ON orders;
DROP POLICY IF EXISTS "orders_anon_insert" ON orders;

CREATE POLICY "orders_select_own"
  ON orders FOR SELECT
  USING (restaurant_id = get_my_restaurant_id());

CREATE POLICY "orders_insert_own"
  ON orders FOR INSERT
  WITH CHECK (restaurant_id = get_my_restaurant_id());

CREATE POLICY "orders_anon_insert"
  ON orders FOR INSERT
  WITH CHECK (
    auth.role() = 'anon'
    AND restaurant_id IS NOT NULL
  );

CREATE POLICY "orders_update_own"
  ON orders FOR UPDATE
  USING (restaurant_id = get_my_restaurant_id())
  WITH CHECK (restaurant_id = get_my_restaurant_id());


-- =============================================================================
-- BLOCO 4: order_items
-- =============================================================================

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_own" ON order_items;
DROP POLICY IF EXISTS "order_items_anon_insert" ON order_items;
DROP POLICY IF EXISTS "order_items_update_own" ON order_items;

CREATE POLICY "order_items_select_own"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE restaurant_id = get_my_restaurant_id()
    )
  );

CREATE POLICY "order_items_insert_own"
  ON order_items FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE restaurant_id = get_my_restaurant_id()
    )
  );

CREATE POLICY "order_items_anon_insert"
  ON order_items FOR INSERT
  WITH CHECK (auth.role() = 'anon');

CREATE POLICY "order_items_update_own"
  ON order_items FOR UPDATE
  USING (
    order_id IN (
      SELECT id FROM orders WHERE restaurant_id = get_my_restaurant_id()
    )
  );


-- =============================================================================
-- BLOCO 5: menu_categories
-- =============================================================================

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_categories_public_read" ON menu_categories;
DROP POLICY IF EXISTS "menu_categories_staff_write" ON menu_categories;

CREATE POLICY "menu_categories_public_read"
  ON menu_categories FOR SELECT
  USING (true);

CREATE POLICY "menu_categories_staff_write"
  ON menu_categories FOR ALL
  USING (restaurant_id = get_my_restaurant_id())
  WITH CHECK (restaurant_id = get_my_restaurant_id());


-- =============================================================================
-- BLOCO 6: menu_items
-- =============================================================================

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_items_public_read" ON menu_items;
DROP POLICY IF EXISTS "menu_items_staff_write" ON menu_items;

CREATE POLICY "menu_items_public_read"
  ON menu_items FOR SELECT
  USING (true);

CREATE POLICY "menu_items_staff_write"
  ON menu_items FOR ALL
  USING (restaurant_id = get_my_restaurant_id())
  WITH CHECK (restaurant_id = get_my_restaurant_id());


-- =============================================================================
-- BLOCO 7: loyalty_customers (se existir)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'loyalty_customers') THEN
    EXECUTE 'ALTER TABLE loyalty_customers ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "loyalty_customers_own" ON loyalty_customers';
    EXECUTE 'DROP POLICY IF EXISTS "loyalty_customers_anon_upsert" ON loyalty_customers';
    EXECUTE '
      CREATE POLICY "loyalty_customers_own"
        ON loyalty_customers FOR ALL
        USING (restaurant_id = get_my_restaurant_id())
        WITH CHECK (restaurant_id = get_my_restaurant_id())
    ';
    EXECUTE '
      CREATE POLICY "loyalty_customers_anon_upsert"
        ON loyalty_customers FOR INSERT
        WITH CHECK (auth.role() = ''anon'')
    ';
    RAISE NOTICE 'RLS aplicado: loyalty_customers';
  ELSE
    RAISE NOTICE 'SKIP: loyalty_customers não existe ainda';
  END IF;
END $$;


-- =============================================================================
-- BLOCO 8: credit_notes (se existir)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'credit_notes') THEN
    EXECUTE 'ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "credit_notes_own" ON credit_notes';
    EXECUTE '
      CREATE POLICY "credit_notes_own"
        ON credit_notes FOR ALL
        USING (restaurant_id = get_my_restaurant_id())
        WITH CHECK (restaurant_id = get_my_restaurant_id())
    ';
    RAISE NOTICE 'RLS aplicado: credit_notes';
  ELSE
    RAISE NOTICE 'SKIP: credit_notes não existe ainda';
  END IF;
END $$;


-- =============================================================================
-- BLOCO 9: efatura_sequences (se existir)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'efatura_sequences') THEN
    EXECUTE 'ALTER TABLE efatura_sequences ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "efatura_sequences_service_only" ON efatura_sequences';
    EXECUTE '
      CREATE POLICY "efatura_sequences_service_only"
        ON efatura_sequences FOR ALL
        USING (false)
        WITH CHECK (false)
    ';
    RAISE NOTICE 'RLS aplicado: efatura_sequences';
  ELSE
    RAISE NOTICE 'SKIP: efatura_sequences não existe ainda (execute supabase_efatura_migration.sql primeiro)';
  END IF;
END $$;


-- =============================================================================
-- VERIFICAÇÃO FINAL: tabelas com RLS ativo
-- =============================================================================

SELECT
  tablename,
  rowsecurity AS "RLS Ativo",
  CASE WHEN rowsecurity THEN '✅ Blindada' ELSE '❌ Exposta' END AS estado
FROM pg_tables
WHERE tablename IN (
  'restaurants', 'users', 'orders', 'order_items',
  'menu_categories', 'menu_items', 'loyalty_customers',
  'credit_notes', 'efatura_sequences'
)
AND schemaname = 'public'
ORDER BY tablename;

-- =============================================================================
-- FIM DA MIGRAÇÃO v2 — Dineo SaaS RLS Multi-Tenant
-- =============================================================================
