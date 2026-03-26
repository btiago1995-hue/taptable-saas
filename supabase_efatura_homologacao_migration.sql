-- =============================================================================
-- Migração: E-Fatura Homologação DNRE
-- Ficheiro: supabase_efatura_homologacao_migration.sql
-- Aplicar: Supabase Dashboard → SQL Editor → Run
-- =============================================================================
-- Adiciona:
--   1. Colunas de estado DNRE na tabela orders
--   2. Tabela efatura_pending_submission (modo offline + contingência)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Colunas DNRE na tabela orders
-- -----------------------------------------------------------------------------

-- Estado da submissão DNRE
-- 'pending'      — IUD gerado, ainda não submetido à DNRE
-- 'authorized'   — DNRE aceitou e autorizou o documento
-- 'offline'      — DNRE inacessível, guardado para sync posterior
-- 'contingencia' — Modo contingência (>7 dias offline)
-- 'error'        — DNRE rejeitou o documento (erro fiscal)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS dnre_status TEXT DEFAULT 'pending';

-- Código de autorização retornado pela DNRE após submissão bem-sucedida
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS dnre_autorizacao TEXT;

-- Timestamp da submissão à DNRE
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS dnre_submitted_at TIMESTAMPTZ;

-- Índice para queries de monitorização (pedidos pendentes de sync)
CREATE INDEX IF NOT EXISTS idx_orders_dnre_status
  ON orders (restaurant_id, dnre_status)
  WHERE dnre_status IN ('pending', 'offline', 'contingencia');

-- -----------------------------------------------------------------------------
-- 2. Tabela de submissões pendentes (modo offline / contingência)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS efatura_pending_submission (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id    UUID REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Identificação do documento
  iud              TEXT NOT NULL,
  tipo_documento   TEXT NOT NULL,                    -- FS | FT | NC | FR | GT
  numero_doc       TEXT NOT NULL,                    -- ex: "FS 2026/00000001"

  -- XML gerado para submissão
  xml_documento    TEXT NOT NULL,

  -- Estado da submissão
  modo             TEXT NOT NULL DEFAULT 'offline',  -- 'offline' | 'contingencia'
  tentativas       INT  NOT NULL DEFAULT 0,
  ultimo_erro      TEXT,                             -- última mensagem de erro DNRE

  -- Prazos (7 dias após criação → transição para contingência)
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prazo_max        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- Timestamps
  ultima_tentativa TIMESTAMPTZ,
  sincronizado_em  TIMESTAMPTZ                       -- preenchido quando sync com sucesso
);

-- Índice para o cron de sync: buscar pendentes por restaurant + prazo
CREATE INDEX IF NOT EXISTS idx_efatura_pending_restaurant
  ON efatura_pending_submission (restaurant_id, modo, sincronizado_em)
  WHERE sincronizado_em IS NULL;

-- Índice para lookup por order_id (idempotência)
CREATE INDEX IF NOT EXISTS idx_efatura_pending_order
  ON efatura_pending_submission (order_id)
  WHERE sincronizado_em IS NULL;

-- RLS: apenas service role pode ler/escrever (tabela fiscal, não exposta ao frontend)
ALTER TABLE efatura_pending_submission ENABLE ROW LEVEL SECURITY;

CREATE POLICY "efatura_pending_service_only"
  ON efatura_pending_submission
  FOR ALL
  USING (false)   -- bloqueia acesso via anon/authenticated
  WITH CHECK (false);

-- -----------------------------------------------------------------------------
-- 3. Actualizar orders existentes com dnre_status baseado no estado actual
-- -----------------------------------------------------------------------------
-- Pedidos entregues com IUD gerado → marcar como 'pending' (ainda não submetidos)
-- Os outros ficam NULL até gerarem IUD.

UPDATE orders
  SET dnre_status = 'pending'
  WHERE iud IS NOT NULL
    AND dnre_status IS NULL;

-- -----------------------------------------------------------------------------
-- 4. Comentários de documentação
-- -----------------------------------------------------------------------------

COMMENT ON COLUMN orders.dnre_status IS
  'Estado da submissão E-Fatura à DNRE: pending | authorized | offline | contingencia | error';

COMMENT ON COLUMN orders.dnre_autorizacao IS
  'Código de autorização DNRE após submissão bem-sucedida';

COMMENT ON COLUMN orders.dnre_submitted_at IS
  'Timestamp da submissão à API DNRE';

COMMENT ON TABLE efatura_pending_submission IS
  'Documentos E-Fatura pendentes de sync com a DNRE (modo offline/contingência). '
  'Prazo máximo: 7 dias. Gerido pelo cron /api/cron/efatura-sync.';
