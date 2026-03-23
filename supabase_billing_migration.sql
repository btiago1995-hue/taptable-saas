-- ============================================================
-- Billing Migration — Dineo SaaS
-- Aplicar via Supabase Dashboard › SQL Editor
-- ============================================================

-- 1. Adicionar estado e grace period à tabela restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'past_due', 'suspended', 'cancelled')),
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ;

-- 2. Inicializar status baseado em dados existentes
UPDATE restaurants SET subscription_status =
  CASE
    WHEN NOT is_active                              THEN 'suspended'
    WHEN subscription_expires_at IS NULL            THEN 'trial'
    WHEN subscription_expires_at < NOW()            THEN 'past_due'
    ELSE                                                 'active'
  END
WHERE subscription_status = 'trial';

-- 3. Tabela de faturas
CREATE TABLE IF NOT EXISTS subscription_invoices (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  amount            INTEGER     NOT NULL,                        -- CVE (ex: 2990)
  plan              TEXT        NOT NULL,
  billing_cycle     TEXT        NOT NULL
                    CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual')),
  status            TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'failed', 'void')),
  due_date          TIMESTAMPTZ NOT NULL,
  paid_at           TIMESTAMPTZ,
  payment_method    TEXT        CHECK (payment_method IN ('manual', 'vinti4', 'stripe')),
  payment_reference TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID        REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_restaurant ON subscription_invoices(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON subscription_invoices(status, due_date);

-- 4. RLS: superadmin vê tudo, restaurante vê as suas próprias
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_all_invoices"    ON subscription_invoices;
DROP POLICY IF EXISTS "restaurant_own_invoices"    ON subscription_invoices;

CREATE POLICY "superadmin_all_invoices" ON subscription_invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "restaurant_own_invoices" ON subscription_invoices
  FOR SELECT USING (
    restaurant_id IN (SELECT restaurant_id FROM users WHERE id = auth.uid())
  );
