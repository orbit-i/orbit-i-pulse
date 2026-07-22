-- =============================================================
-- ORBIT-I PULSE — MIGRATION 4: PROFILES, TEAMS & DOCUMENT SHARING
-- =============================================================
-- Run this ONCE in the Supabase SQL Editor, after migration-3.
-- Adds: phone numbers + richer profiles, a Teams layer nested under
-- Departments, a workspace Documents system (private/team/department/
-- company visibility), and retires the registration-number gate on
-- sign-up / password reset (old data is kept, just no longer required).
-- =============================================================

-- ---------- 1. RICHER PROFILE FIELDS ----------
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
-- avatar_url and job_title already exist from earlier migrations.

-- ---------- 2. REGISTRATION NUMBER IS NOW OPTIONAL ----------
-- Column stays (existing REG/ORBIT-I/... records aren't touched),
-- but sign-up / forgot-password no longer require or check it.
ALTER TABLE users ALTER COLUMN registration_number DROP NOT NULL;

-- ---------- 3. TEAMS (nested under a Department) ----------
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  lead_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, department_id)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department_id);

-- ---------- 4. WORKSPACE DOCUMENTS (shared + private) ----------
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  -- Either a pasted link (Drive/Notion/etc.) or a file stored in the
  -- "orbit-documents" Supabase Storage bucket (see note below).
  link_url TEXT,
  storage_path TEXT,
  file_name VARCHAR(255),
  file_size BIGINT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  -- private: only the owner (+ admin/CEO/CTO/HR). team: owner's team.
  -- department: owner's department. company: everyone.
  visibility VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','team','department','company')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_visibility ON documents(visibility);
CREATE INDEX IF NOT EXISTS idx_documents_department ON documents(department_id);
CREATE INDEX IF NOT EXISTS idx_documents_team ON documents(team_id);

ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

-- ---------- 5. SEED A DEFAULT TEAM PER DEPARTMENT (optional, editable later) ----------
INSERT INTO teams (name, department_id)
SELECT 'Core Team', d.id FROM departments d
WHERE NOT EXISTS (SELECT 1 FROM teams t WHERE t.department_id = d.id);

-- =============================================================
-- TWO MANUAL STEPS — Supabase Storage buckets:
-- 1) Dashboard → Storage → New bucket → "orbit-documents" → PRIVATE.
--    Used for shared/private workspace documents. The app reads/writes
--    it server-side with the service-role key regardless of the
--    public toggle; keeping it private just stops anyone guessing a
--    file's URL and downloading it directly (downloads go through a
--    signed URL that expires in 60 seconds).
-- 2) Dashboard → Storage → New bucket → "orbit-avatars" → PUBLIC.
--    Used for profile pictures — public so they render directly as
--    <img src> everywhere (sidebar, team page, org chart) without a
--    signed-URL round trip.
-- If you skip these, document/avatar LINKS still work fine — only
-- direct file uploads need the buckets.
-- =============================================================
