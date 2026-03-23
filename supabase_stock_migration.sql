-- Stock Management Migration
-- Adds stock tracking to menu items with auto sold_out trigger
-- Apply via Supabase Dashboard SQL Editor

-- 1. Add stock columns to menu_items
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS track_stock   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_quantity int     NOT NULL DEFAULT 0;

-- 2. Function: decrement stock when order item is inserted
CREATE OR REPLACE FUNCTION decrement_menu_item_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_menu_item_id uuid;
  v_new_qty      int;
BEGIN
  -- Only act if menu_item_id is set (custom items have null)
  IF NEW.menu_item_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE menu_items
  SET stock_quantity = GREATEST(stock_quantity - NEW.quantity, 0)
  WHERE id = NEW.menu_item_id
    AND track_stock = true
  RETURNING stock_quantity INTO v_new_qty;

  -- Auto mark sold_out when stock reaches 0
  IF v_new_qty IS NOT NULL AND v_new_qty = 0 THEN
    UPDATE menu_items SET status = 'sold_out'
    WHERE id = NEW.menu_item_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Trigger on order_items insert
DROP TRIGGER IF EXISTS trg_decrement_stock ON order_items;
CREATE TRIGGER trg_decrement_stock
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION decrement_menu_item_stock();
