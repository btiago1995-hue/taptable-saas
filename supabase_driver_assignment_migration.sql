-- Driver Assignment Migration
-- Adds assigned_driver_id and assigned_driver_name to orders table
-- Apply via Supabase Dashboard SQL Editor

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS assigned_driver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_driver_name text;

-- Index for driver-side queries (filter by assigned driver efficiently)
CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver
  ON orders (assigned_driver_id)
  WHERE assigned_driver_id IS NOT NULL;

-- Allow drivers to read orders assigned to them (RLS policy)
-- Assumes a "driver" role exists in the users table
CREATE POLICY IF NOT EXISTS "Drivers can view their assigned orders"
  ON orders FOR SELECT
  USING (assigned_driver_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Drivers can update status of their assigned orders"
  ON orders FOR UPDATE
  USING (assigned_driver_id = auth.uid())
  WITH CHECK (assigned_driver_id = auth.uid());
