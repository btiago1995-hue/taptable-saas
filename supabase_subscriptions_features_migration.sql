-- ============================================================================
-- MIGRAÇÃO: Features de Alta Prioridade + Subscrições — Dineo SaaS
-- Execute no Supabase Dashboard → SQL Editor
-- Idempotente: seguro de correr várias vezes
-- ============================================================================

-- ============================================================================
-- PARTE 1: Migrar nomes de planos existentes
-- Essencial → starter | growth mantém-se | Elite → pro
-- ============================================================================

UPDATE restaurants SET subscription_plan = 'starter' WHERE subscription_plan = 'essencial';
UPDATE restaurants SET subscription_plan = 'pro'     WHERE subscription_plan = 'elite';

-- ============================================================================
-- PARTE 2: Novas colunas em restaurants (billing e expiração)
-- ============================================================================

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS subscription_billing      TEXT DEFAULT 'monthly'
    CHECK (subscription_billing IN ('monthly', 'quarterly', 'annual')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_started_at   TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN restaurants.subscription_billing     IS 'Periodicidade de faturação: monthly | quarterly | annual';
COMMENT ON COLUMN restaurants.subscription_expires_at  IS 'Data de expiração da subscrição atual';
COMMENT ON COLUMN restaurants.subscription_started_at  IS 'Data de início da subscrição atual';

-- ============================================================================
-- PARTE 3: Tabela — client_accounts (Conta Corrente de Clientes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_accounts (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  nif             TEXT,
  email           TEXT,
  phone           TEXT,
  address         TEXT,
  credit_limit    NUMERIC(10,2) DEFAULT 0,      -- limite de crédito autorizado
  current_balance NUMERIC(10,2) DEFAULT 0,      -- saldo devedor actual (positivo = deve-nos)
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_accounts_restaurant ON client_accounts(restaurant_id);

-- RLS
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_accounts_own" ON client_accounts;
CREATE POLICY "client_accounts_own"
  ON client_accounts FOR ALL
  USING (restaurant_id = get_my_restaurant_id())
  WITH CHECK (restaurant_id = get_my_restaurant_id());

COMMENT ON TABLE client_accounts IS 'Conta corrente de clientes B2B por restaurante';

-- ============================================================================
-- PARTE 4: Tabela — client_transactions (Movimentos de Conta)
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_transactions (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  account_id      UUID        NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL CHECK (type IN ('invoice', 'payment', 'credit_note', 'adjustment')),
  amount          NUMERIC(10,2) NOT NULL,        -- positivo = débito (factura), negativo = crédito (pagamento)
  description     TEXT,
  reference       TEXT,                          -- nº de fatura ou referência de pagamento
  order_id        UUID        REFERENCES orders(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_transactions_account ON client_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_client_transactions_restaurant ON client_transactions(restaurant_id);

-- Trigger: actualizar saldo da conta quando há novo movimento
CREATE OR REPLACE FUNCTION update_client_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE client_accounts
  SET current_balance = current_balance + NEW.amount,
      updated_at = NOW()
  WHERE id = NEW.account_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_client_balance ON client_transactions;
CREATE TRIGGER trg_update_client_balance
  AFTER INSERT ON client_transactions
  FOR EACH ROW EXECUTE FUNCTION update_client_balance();

-- RLS
ALTER TABLE client_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_transactions_own" ON client_transactions;
CREATE POLICY "client_transactions_own"
  ON client_transactions FOR ALL
  USING (restaurant_id = get_my_restaurant_id())
  WITH CHECK (restaurant_id = get_my_restaurant_id());

COMMENT ON TABLE client_transactions IS 'Movimentos de conta corrente: faturas, pagamentos, liquidações';

-- ============================================================================
-- PARTE 5: Tabela — irs_irc_retencoes (Retenções na Fonte)
-- ============================================================================

CREATE TABLE IF NOT EXISTS irs_irc_retencoes (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id        UUID        REFERENCES orders(id),
  tipo            TEXT        NOT NULL CHECK (tipo IN ('IRS', 'IRC')),
  percentagem     NUMERIC(5,2) NOT NULL,         -- ex: 15.00 ou 20.00
  base_incidencia NUMERIC(10,2) NOT NULL,        -- valor bruto sobre o qual incide a retenção
  valor_retido    NUMERIC(10,2) NOT NULL,        -- base_incidencia * percentagem / 100
  nif_retido      TEXT,                          -- NIF do sujeito passivo sobre quem incide
  nome_retido     TEXT,
  document_ref    TEXT,                          -- referência da fatura
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retencoes_restaurant_date ON irs_irc_retencoes(restaurant_id, created_at DESC);

-- RLS
ALTER TABLE irs_irc_retencoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "retencoes_own" ON irs_irc_retencoes;
CREATE POLICY "retencoes_own"
  ON irs_irc_retencoes FOR ALL
  USING (restaurant_id = get_my_restaurant_id())
  WITH CHECK (restaurant_id = get_my_restaurant_id());

COMMENT ON TABLE irs_irc_retencoes IS 'Retenções na fonte IRS/IRC emitidas pelo restaurante';

-- ============================================================================
-- PARTE 6: Tabela — contact_leads (Formulário de Contacto PRO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_leads (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT,
  email           TEXT,
  phone           TEXT,
  business_name   TEXT,
  num_locations   INTEGER,
  message         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- contact_leads não tem restaurant_id — é público (sem RLS de restaurante)
-- Acesso apenas via service_role nas API routes

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

SELECT table_name, 'OK' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'client_accounts', 'client_transactions',
    'irs_irc_retencoes', 'contact_leads'
  )
ORDER BY table_name;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'restaurants'
  AND column_name IN ('subscription_plan', 'subscription_billing', 'subscription_expires_at', 'subscription_started_at')
ORDER BY column_name;

-- ============================================================================
-- FIM DA MIGRAÇÃO — Dineo SaaS Features v3
-- ============================================================================
