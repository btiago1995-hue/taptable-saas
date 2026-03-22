-- Função atómica que combina: obter próximo sequencial + actualizar hash da série
-- Substitui a necessidade de chamar efatura_next_sequence e efatura_update_last_hash separadamente
-- NOTA: Esta função é preparatória. Integração completa requer actualização do route.ts
--       numa fase posterior quando a DNRE confirmar o protocolo de sequências.

-- Adicionar coluna para registar falhas de hash (auditoria)
ALTER TABLE efatura_sequences ADD COLUMN IF NOT EXISTS last_hash_error JSONB;
ALTER TABLE efatura_sequences ADD COLUMN IF NOT EXISTS last_hash_error_at TIMESTAMPTZ;

-- Comentário de auditoria
COMMENT ON COLUMN efatura_sequences.last_hash_error IS 'Registo do último erro ao actualizar o hash da série. Para diagnóstico de integridade.';
