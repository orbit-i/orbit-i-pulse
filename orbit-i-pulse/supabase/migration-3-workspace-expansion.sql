-- =============================================================
-- ORBIT-I PULSE — MIGRATION 3: FULL WORKSPACE EXPANSION
-- =============================================================
-- Run this ONCE in the Supabase SQL Editor, after schema.sql and the
-- earlier migration files. Adds: the full role hierarchy (CEO, CTO,
-- HR Manager, Associate HR, Team Lead, Team Member), a structured
-- departments table, job titles, tasks, leave requests, and a
-- company announcements feed — the pieces needed for every seat to
-- get its own personalized dashboard/workspace.
-- =============================================================

-- ---------- 1. EXPAND THE ROLE CHECK CONSTRAINT ----------
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
  role IN (
    'admin','ceo','cto','hr_manager','associate_hr',
    'manager','team_lead','team_member','employee',
    'intern','core_team_member'
  )
);

-- ---------- 2. DEPARTMENTS ----------
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  head_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Structured FK alongside the existing free-text `department` column
-- (kept for backward compatibility with older rows/exports).
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);

-- ---------- 3. TASKS ----------
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','blocked','done')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ---------- 4. LEAVE / TIME-OFF REQUESTS ----------
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type VARCHAR(20) NOT NULL DEFAULT 'casual' CHECK (leave_type IN ('casual','sick','annual','unpaid','other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_user ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);

-- ---------- 5. COMPANY ANNOUNCEMENTS (workspace feed) ----------
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  posted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL, -- null = company-wide
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_department ON announcements(department_id);

-- ---------- 6. SEED DEFAULT DEPARTMENTS ----------
INSERT INTO departments (name, description) VALUES
  ('Executive', 'Company leadership and strategy'),
  ('Engineering', 'Full-stack, mobile, and platform development'),
  ('DevOps & QA', 'Infrastructure, deployment, and quality assurance'),
  ('AI/ML', 'AI integration, NLP, and machine learning work'),
  ('Design & Branding', 'UI/UX, product design, and brand identity'),
  ('Human Resources', 'Recruitment, onboarding, and team operations'),
  ('Business & Growth', 'Client acquisition, partnerships, and strategy')
ON CONFLICT (name) DO NOTHING;

-- ---------- 7. DISABLE RLS (same local-JWT auth model as schema.sql) ----------
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;

-- =============================================================
-- Migration complete. After running this:
-- 1. Assign department_id / job_title to existing users from the
--    new Departments page (admin/CEO/CTO/HR Manager).
-- 2. Promote people into the new roles (ceo, cto, hr_manager,
--    associate_hr, team_lead) from the Team page — the dropdown
--    and API already recognize them via lib/roles.ts.
-- =============================================================
