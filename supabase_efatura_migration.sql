-- =============================================================================
-- Migração E-Fatura — Dineo SaaS
-- Sistema de Geração de IUD (Identificador Único de Documento)
-- Conforme especificações técnicas DNRE / E-Fatura Cabo Verde
-- =============================================================================
-- Executar no Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Adicionar colunas E-Fatura à tabela orders
-- -----------------------------------------------------------------------------

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS iud             TEXT,           -- 45 chars — Identificador Único do Documento
  ADD COLUMN IF NOT EXISTS document_hash   TEXT,           -- 22 chars — hash para cadeia do próximo doc
  ADD COLUMN IF NOT EXISTS document_number TEXT,           -- ex: "FS 2026/00000001"
  ADD COLUMN IF NOT EXISTS document_type   TEXT;           -- "FS" | "FT" | "FR" | "GT" | "NC" | "ND"

-- Garantir unicidade do IUD (um documento = um IUD)
CREATE UNIQUE INDEX IF NOT EXISTS orders_iud_unique
  ON orders (iud)
  WHERE iud IS NOT NULL;

COMMENT ON COLUMN orders.iud IS
  'Identificador Único de Documento E-Fatura (45 chars). NIF(9) + TipoDoc(2) + Ano(4) + Seq(8) + Hash(22). Conforme DNRE Cabo Verde.';
COMMENT ON COLUMN orders.document_hash IS
  'Hash HMAC-SHA256 de 22 chars deste documento. Serve como hashAnterior para o próximo documento da mesma série.';
COMMENT ON COLUMN orders.document_number IS
  'Número do documento formatado para impressão. Ex: "FS 2026/00000001".';
COMMENT ON COLUMN orders.document_type IS
  'Tipo de documento fiscal emitido: FS (Fatura Simplificada), FT (Fatura), FR (Fatura-Recibo), GT (Guia de Transporte).';


-- -----------------------------------------------------------------------------
-- 2. Tabela de controlo de sequências por restaurante / tipo / ano
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS efatura_sequences (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id       UUID    NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  tipo_documento      TEXT    NOT NULL CHECK (tipo_documento IN ('FS','FT','FR','GT','NC','ND')),
  ano                 INTEGER NOT NULL,
  ultimo_sequencial   INTEGER NOT NULL DEFAULT 0,     -- último número emitido
  ultimo_hash         TEXT    NOT NULL DEFAULT '0',   -- hash do último documento
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (restaurant_id, tipo_documento, ano)
);

COMMENT ON TABLE efatura_sequences IS
  'Controlo de sequenciais E-Fatura por restaurante, tipo de documento e ano. Garante unicidade e cadeia de hashes.';

-- RLS: apenas o próprio restaurante lê/escreve (via service role na API)
ALTER TABLE efatura_sequences ENABLE ROW LEVEL SECURITY;

-- Política: apenas service role acede (a API route usa SUPABASE_SERVICE_ROLE_KEY)
CREATE POLICY "efatura_sequences_service_only"
  ON efatura_sequences
  FOR ALL
  USING (false)  -- bloqueia acesso directo de clientes anónimos/autenticados
  WITH CHECK (false);


-- -----------------------------------------------------------------------------
-- 3. Função RPC: obter próximo sequencial (atómico)
-- -----------------------------------------------------------------------------
-- Incrementa o contador e retorna o novo valor + hash anterior.
-- Usa um UPSERT + FOR UPDATE para evitar race conditions em alta concorrência.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION efatura_next_sequence(
  p_restaurant_id UUID,
  p_tipo_documento TEXT,
  p_ano           INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  -- executa com privilégios do owner (bypassa RLS)
AS $$
DECLARE
  v_proximo_sequencial INTEGER;
  v_hash_anterior      TEXT;
BEGIN
  -- Inserir se não existir, incrementar se existir (atómico)
  INSERT INTO efatura_sequences (restaurant_id, tipo_documento, ano, ultimo_sequencial, ultimo_hash)
  VALUES (p_restaurant_id, p_tipo_documento, p_ano, 1, '0')
  ON CONFLICT (restaurant_id, tipo_documento, ano)
  DO UPDATE SET
    ultimo_sequencial = efatura_sequences.ultimo_sequencial + 1,
    updated_at        = NOW()
  RETURNING ultimo_sequencial, ultimo_hash
  INTO v_proximo_sequencial, v_hash_anterior;

  RETURN json_build_object(
    'proximo_sequencial', v_proximo_sequencial,
    'hash_anterior',      v_hash_anterior
  );
END;
$$;

COMMENT ON FUNCTION efatura_next_sequence IS
  'Obtém atomicamente o próximo número sequencial E-Fatura para a série indicada. Thread-safe.';


-- -----------------------------------------------------------------------------
-- 4. Função RPC: actualizar o último hash da série
-- -----------------------------------------------------------------------------
-- Chamada após gerar e persistir o IUD, para preparar a cadeia do próximo doc.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION efatura_update_last_hash(
  p_restaurant_id UUID,
  p_tipo_documento TEXT,
  p_ano           INTEGER,
  p_hash          TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE efatura_sequences
  SET
    ultimo_hash = p_hash,
    updated_at  = NOW()
  WHERE
    restaurant_id  = p_restaurant_id AND
    tipo_documento = p_tipo_documento AND
    ano            = p_ano;
END;
$$;

COMMENT ON FUNCTION efatura_update_last_hash IS
  'Actualiza o hash do último documento emitido, para ser usado como hashAnterior no próximo documento da série.';


-- -----------------------------------------------------------------------------
-- 5. Vista: resumo de emissão E-Fatura por restaurante (útil para superadmin)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_efatura_resumo AS
SELECT
  r.id             AS restaurant_id,
  r.name           AS restaurant_name,
  r.nif_number     AS nif_emitente,
  s.tipo_documento,
  s.ano,
  s.ultimo_sequencial AS total_documentos_emitidos,
  s.updated_at     AS ultimo_documento_em
FROM efatura_sequences s
JOIN restaurants r ON r.id = s.restaurant_id
ORDER BY r.name, s.ano DESC, s.tipo_documento;

COMMENT ON VIEW v_efatura_resumo IS
  'Resumo de documentos E-Fatura emitidos por restaurante. Útil para auditoria e painel superadmin.';


-- -----------------------------------------------------------------------------
-- 6. Índices de performance
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_orders_iud
  ON orders (iud)
  WHERE iud IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_document_type_restaurant
  ON orders (restaurant_id, document_type, created_at DESC)
  WHERE document_type IS NOT NULL;


-- =============================================================================
-- Verificação pós-migração
-- =============================================================================
-- Executar após aplicar para confirmar que tudo está correcto:
--
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'orders' AND column_name IN ('iud','document_hash','document_number','document_type');
--
-- SELECT * FROM efatura_sequences LIMIT 5;
--
-- SELECT proactive_check FROM (
--   SELECT 'OK: ' || count(*) || ' colunas E-Fatura em orders' AS proactive_check
--   FROM information_schema.columns
--   WHERE table_name = 'orders'
--     AND column_name IN ('iud','document_hash','document_number','document_type')
-- ) t;
-- =============================================================================
