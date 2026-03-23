-- Retenções IRS/IRC Migration
-- Tabela para registar retenções na fonte sobre faturas B2B
-- Apply via Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS irs_irc_retencoes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id    uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id         uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  month            int NOT NULL, -- 1-12
  year             int NOT NULL,
  type             text NOT NULL CHECK (type IN ('IRS', 'IRC')), -- IRS = pessoa singular, IRC = empresa
  entity_name      text NOT NULL,
  entity_nif       text NOT NULL,
  base_amount      numeric(12, 2) NOT NULL, -- valor sobre o qual recai a retenção
  rate             numeric(5, 2) NOT NULL,  -- ex: 20.00 para 20%
  retained_amount  numeric(12, 2) NOT NULL, -- base_amount * rate / 100
  invoice_ref      text           -- referência da fatura (ex: FT 2025/0001)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_retencoes_restaurant ON irs_irc_retencoes (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_retencoes_period     ON irs_irc_retencoes (restaurant_id, year, month);

-- RLS
ALTER TABLE irs_irc_retencoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can read their restaurant retencoes"
  ON irs_irc_retencoes FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert retencoes"
  ON irs_irc_retencoes FOR INSERT
  WITH CHECK (true); -- only supabaseAdmin (service role) inserts
