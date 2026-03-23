-- Push Notifications Migration
-- Stores Web Push subscriptions per restaurant staff member
-- Apply via Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint      text NOT NULL,
  p256dh        text NOT NULL,
  auth          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subs_restaurant ON push_subscriptions (restaurant_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage push subscriptions"
  ON push_subscriptions FOR ALL
  USING (true) WITH CHECK (true);
