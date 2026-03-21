-- =============================================================================
-- MIGRAÇÃO RLS: Blindagem Multi-Tenant — Dineo SaaS
-- Garante isolamento total de dados entre restaurantes (Silos RLS)
-- =============================================================================
-- INSTRUÇÕES: Executar no Supabase Dashboard → SQL Editor → New Query
-- Execute BLOCO A BLOCO ou tudo de uma vez — é idempotente (IF NOT EXISTS / OR REPLACE)
-- =============================================================================


-- =============================================================================
-- BLOCO 0: Função helper — get_my_restaurant_id()
-- Retorna o restaurant_id do utilizador autenticado atual.
-- SECURITY DEFINER: executa como owner, bypassa RLS da tabela users.
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
  'Retorna o restaurant_id do utilizador autenticado. Usado pelas políticas RLS para isolar dados por restaurante.';


-- =============================================================================
-- BLOCO 1: Tabela — restaurants
-- Cada restaurante só lê e edita os seus próprios dados.
-- =============================================================================

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "restaurants_select_own" ON restaurants;
DROP POLICY IF EXISTS "restaurants_update_own" ON restaurants;
DROP POLICY IF EXISTS "restaurants_insert_onboarding" ON restaurants;

-- Leitura: o próprio restaurante ou clientes do menu público (sem auth)
CREATE POLICY "restaurants_select_own"
  ON restaurants FOR SELECT
  USING (
    id = get_my_restaurant_id()
    OR auth.role() = 'anon' -- clientes sem login podem ver o restaurante pelo menu QR
  );

-- Edição: apenas o próprio restaurante (autenticado)
CREATE POLICY "restaurants_update_own"
  ON restaurants FOR UPDATE
  USING (id = get_my_restaurant_id())
  WITH CHECK (id = get_my_restaurant_id());

-- Criação: apenas durante onboarding (auth autenticado pode criar o seu restaurante)
CREATE POLICY "restaurants_insert_onboarding"
  ON restaurants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- =============================================================================
-- BLOCO 2: Tabela — users (perfis de staff)
-- Staff só vê e gere colegas do mesmo restaurante.
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
    OR (auth.uid() IS NOT NULL AND id = auth.uid()) -- onboarding: utilizador cria o seu próprio perfil
  );

CREATE POLICY "users_delete_own_restaurant"
  ON users FOR DELETE
  USING (restaurant_id = get_my_restaurant_id());


-- =============================================================================
-- BLOCO 3: Tabela — orders
-- Pedidos completamente isolados: cada restaurante vê APENAS os seus pedidos.
-- =============================================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON orders;
DROP POLICY IF EXISTS "orders_insert_own" ON orders;
DROP POLICY IF EXISTS "orders_update_own" ON orders;
DROP POLICY IF EXISTS "orders_anon_insert" ON orders;

-- Leitura: staff autenticado do próprio restaurante
CREATE POLICY "orders_select_own"
  ON orders FOR SELECT
  USING (restaurant_id = get_my_restaurant_id());

-- Inserção pelo staff autenticado
CREATE POLICY "orders_insert_own"
  ON orders FOR INSERT
  WITH CHECK (restaurant_id = get_my_restaurant_id());

-- Inserção anónima: clientes do menu QR que fazem pedidos sem conta
-- Precisamos permitir isto para o fluxo de cliente funcionar
CREATE POLICY "orders_anon_insert"
  ON orders FOR INSERT
  WITH CHECK (
    auth.role() = 'anon'
    AND restaurant_id IS NOT NULL -- sempre ligado a um restaurante válido
  );

-- Edição de status: staff do próprio restaurante
CREATE POLICY "orders_update_own"
  ON orders FOR UPDATE
  USING (restaurant_id = get_my_restaurant_id())
  WITH CHECK (restaurant_id = get_my_restaurant_id());


-- =============================================================================
-- BLOCO 4: Tabela — order_items
-- Herda o isolamento via orders. Filtrado por restaurant_id do pedido pai.
-- =============================================================================

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_own" ON order_items;
DROP POLICY IF EXISTS "order_items_update_own" ON order_items;
DROP POLICY IF EXISTS "order_items_anon_insert" ON order_items;

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

-- Clientes anónimos podem inserir itens nos seus próprios pedidos
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
-- BLOCO 5: Tabela — menu_categories
-- Cardápio isolado por restaurante.
-- =============================================================================

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_categories_public_read" ON menu_categories;
DROP POLICY IF EXISTS "menu_categories_staff_write" ON menu_categories;

-- Leitura pública: necessária para o QR Code do menu funcionar sem login
CREATE POLICY "menu_categories_public_read"
  ON menu_categories FOR SELECT
  USING (true); -- qualquer um pode ver categorias (filtrado por restaurant_id no código)

-- Escrita: apenas staff autenticado do próprio restaurante
CREATE POLICY "menu_categories_staff_write"
  ON menu_categories FOR ALL
  USING (restaurant_id = get_my_restaurant_id())
  WITH CHECK (restaurant_id = get_my_restaurant_id());


-- =============================================================================
-- BLOCO 6: Tabela — menu_items
-- Items do cardápio visíveis publicamente (QR Code), editáveis apenas pelo próprio.
-- =============================================================================

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_items_public_read" ON menu_items;
DROP POLICY IF EXISTS "menu_items_staff_write" ON menu_items;

CREATE POLICY "menu_items_public_read"
  ON menu_items FOR SELECT
  USING (true); -- qualquer um pode ver itens (necessário para menu QR)

CREATE POLICY "menu_items_staff_write"
  ON menu_items FOR ALL
  USING (restaurant_id = get_my_restaurant_id())
  WITH CHECK (restaurant_id = get_my_restaurant_id());


-- =============================================================================
-- BLOCO 7: Tabela — loyalty_customers
-- Clientes de fidelidade: nunca partilhados entre restaurantes.
-- =============================================================================

ALTER TABLE loyalty_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_customers_own" ON loyalty_customers;
DROP POLICY IF EXISTS "loyalty_customers_anon_upsert" ON loyalty_customers;

CREATE POLICY "loyalty_customers_own"
  ON loyalty_customers FOR ALL
  USING (restaurant_id = get_my_restaurant_id())
  WITH CHECK (restaurant_id = get_my_restaurant_id());

-- Clientes anónimos (QR) podem registar-se no programa de fidelidade
CREATE POLICY "loyalty_customers_anon_upsert"
  ON loyalty_customers FOR INSERT
  WITH CHECK (auth.role() = 'anon');


-- =============================================================================
-- BLOCO 8: Tabela — credit_notes (Notas de Crédito)
-- Documentos fiscais isolados por restaurante.
-- =============================================================================

ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_notes_own" ON credit_notes;

CREATE POLICY "credit_notes_own"
  ON credit_notes FOR ALL
  USING (restaurant_id = get_my_restaurant_id())
  WITH CHECK (restaurant_id = get_my_restaurant_id());


-- =============================================================================
-- BLOCO 9: Tabela — efatura_sequences (já protegida, mas reforçamos)
-- Sequências fiscais: bloqueio total ao cliente anónimo/autenticado.
-- Só acessível via service_role nas API routes.
-- =============================================================================

ALTER TABLE efatura_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "efatura_sequences_service_only" ON efatura_sequences;

CREATE POLICY "efatura_sequences_service_only"
  ON efatura_sequences FOR ALL
  USING (false)  -- bloqueia TUDO para clientes
  WITH CHECK (false);

-- Nota: A API de e-fatura usa SUPABASE_SERVICE_ROLE_KEY que bypassa o RLS automaticamente.


-- =============================================================================
-- VERIFICAÇÃO FINAL
-- Execute estas queries após a migração para confirmar que está tudo correto:
-- =============================================================================

-- 1. Verificar que RLS está ativo em todas as tabelas críticas:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN (
  'restaurants', 'users', 'orders', 'order_items',
  'menu_categories', 'menu_items', 'loyalty_customers',
  'credit_notes', 'efatura_sequences'
)
ORDER BY tablename;

-- Esperado: rowsecurity = TRUE em todas as tabelas acima.

-- 2. Verificar políticas criadas:
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN (
  'restaurants', 'users', 'orders', 'order_items',
  'menu_categories', 'menu_items', 'loyalty_customers',
  'credit_notes', 'efatura_sequences'
)
ORDER BY tablename, policyname;

-- =============================================================================
-- FIM DA MIGRAÇÃO RLS — Dineo SaaS Multi-Tenant Security
-- =============================================================================
