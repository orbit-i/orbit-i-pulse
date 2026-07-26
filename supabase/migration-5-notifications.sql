-- =============================================================
-- ORBIT-I PULSE — MIGRATION 5: NOTIFICATIONS
-- =============================================================
-- Adds an in-app notification system (bell icon + unread badge +
-- dedicated alert tone). Purely additive — does not touch any
-- existing table or data. Safe to run on a live, populated database.
-- =============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  type VARCHAR(30) NOT NULL DEFAULT 'general',
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
