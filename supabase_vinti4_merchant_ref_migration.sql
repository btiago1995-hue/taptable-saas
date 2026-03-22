-- Adiciona coluna merchant_ref à tabela orders para lookup directo do webhook Vinti4
ALTER TABLE orders ADD COLUMN IF NOT EXISTS merchant_ref VARCHAR(20);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_ref ON orders(merchant_ref);
