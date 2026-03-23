-- ─── Audit Log ───────────────────────────────────────────────────────────────
-- Regista acções críticas: pagamentos, alterações de plano, criação de staff,
-- alterações de configuração, suspensões, etc.
-- Aplicar via Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS audit_logs (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now() NOT NULL,
  restaurant_id uuid        REFERENCES restaurants(id) ON DELETE SET NULL,
  user_id       uuid        REFERENCES auth.users(id)  ON DELETE SET NULL,
  action        text        NOT NULL,   -- ex: 'payment.confirmed', 'staff.created', 'plan.changed'
  entity        text        NOT NULL,   -- ex: 'order', 'user', 'restaurant', 'subscription'
  entity_id     text,                   -- UUID ou referência da entidade afectada
  metadata      jsonb       DEFAULT '{}'::jsonb,  -- dados adicionais (amount, old_value, new_value, etc.)
  ip_address    text                    -- IP do pedido (quando disponível)
);

-- Índices para queries de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_restaurant ON audit_logs (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user       ON audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action     ON audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity     ON audit_logs (entity, entity_id);

-- RLS: apenas superadmin e o próprio restaurante podem ver os seus logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_superadmin"
  ON audit_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'superadmin'
    )
  );

CREATE POLICY "audit_logs_own_restaurant"
  ON audit_logs FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );

-- Comentários
COMMENT ON TABLE  audit_logs             IS 'Log imutável de acções críticas do sistema';
COMMENT ON COLUMN audit_logs.action      IS 'Formato: entidade.verbo — ex: payment.confirmed, staff.created, plan.changed';
COMMENT ON COLUMN audit_logs.metadata    IS 'JSON com contexto adicional: montantes, valores anteriores/novos, referências';
COMMENT ON COLUMN audit_logs.ip_address  IS 'IP do pedido HTTP — para auditoria de segurança';
