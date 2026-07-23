-- =============================================================
-- ORBIT-I PULSE — FRESH INSTALL (run this ONE file, nothing else)
-- =============================================================
-- Use this INSTEAD OF schema.sql + migration-2/3/4 when you want a
-- clean slate — e.g. a brand-new Supabase project, or an existing
-- one you're okay wiping and rebuilding from scratch.
--
-- ⚠️ WARNING: This DELETES every ORBIT-I Pulse table and ALL data in
-- them (every user, every attendance record, every report — everyone,
-- including your own admin account). After running this you will
-- need to register a fresh account (the first one to register
-- automatically becomes admin) or run `npm run bootstrap-admin`.
--
-- If you have real data you care about, do NOT run this — instead
-- run migration-3-workspace-expansion.sql and
-- migration-4-profiles-teams-documents.sql on top of your existing
-- schema.sql install.
--
-- How to run: Supabase Dashboard → SQL Editor → New query → paste
-- this ENTIRE file → Run.
-- =============================================================

-- ---------- 0. DROP EVERYTHING (clean slate) ----------
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS performance_reviews CASCADE;
DROP TABLE IF EXISTS daily_reports CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS company_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ---------- 1. USERS ----------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'intern' CHECK (role IN (
    'admin','ceo','cto','hr_manager','associate_hr',
    'manager','team_lead','team_member','employee',
    'intern','core_team_member'
  )),
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  avatar_url TEXT,
  phone VARCHAR(30),
  job_title VARCHAR(120),
  department VARCHAR(100),                 -- legacy free-text, kept for backward compatibility
  department_id UUID,                       -- FK added below, after departments table exists
  team_id UUID,                             -- FK added below, after teams table exists
  registration_number VARCHAR(60) UNIQUE,   -- optional now; no longer required at sign-up
  security_question TEXT,
  security_answer_hash TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- 2. ATTENDANCE ----------
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ,
  check_in_ip VARCHAR(45),
  check_out_ip VARCHAR(45),
  status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present','late','half_day','absent')),
  is_late BOOLEAN DEFAULT false,
  is_early_leave BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE attendance ADD COLUMN check_in_date DATE GENERATED ALWAYS AS ((check_in AT TIME ZONE 'UTC')::date) STORED;
CREATE UNIQUE INDEX idx_attendance_user_date ON attendance(user_id, check_in_date);

-- ---------- 3. DAILY REPORTS ----------
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tasks_completed TEXT NOT NULL,
  blockers TEXT,
  hours_spent NUMERIC(4,2),
  attachment_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','reviewed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, report_date)
);

-- ---------- 4. PERFORMANCE REVIEWS ----------
CREATE TABLE performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- 5. COMPANY SETTINGS ----------
CREATE TABLE company_settings (
  id INT PRIMARY KEY DEFAULT 1,
  company_name VARCHAR(150) NOT NULL DEFAULT 'ORBIT-I',
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#092F69',
  secondary_color VARCHAR(7) DEFAULT '#060B18',
  admin_email VARCHAR(150) NOT NULL DEFAULT 'admin@orbit-i.com',
  CHECK (id = 1)
);

-- ---------- 6. DEPARTMENTS ----------
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  head_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- 7. TEAMS (nested under a department) ----------
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  lead_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, department_id)
);

-- Now that departments/teams exist, attach the FKs on users
ALTER TABLE users ADD CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- ---------- 8. TASKS ----------
CREATE TABLE tasks (
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

-- ---------- 9. LEAVE / TIME-OFF REQUESTS ----------
CREATE TABLE leave_requests (
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

-- ---------- 10. ANNOUNCEMENTS ----------
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  posted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- 11. DOCUMENTS (workspace sharing) ----------
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  link_url TEXT,
  storage_path TEXT,
  file_name VARCHAR(255),
  file_size BIGINT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  visibility VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','team','department','company')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- 12. INDEXES ----------
CREATE INDEX idx_attendance_user ON attendance(user_id);
CREATE INDEX idx_reports_user ON daily_reports(user_id);
CREATE INDEX idx_reviews_report ON performance_reviews(report_id);
CREATE INDEX idx_users_manager ON users(manager_id);
CREATE INDEX idx_users_registration_number ON users(registration_number);
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_team ON users(team_id);
CREATE INDEX idx_teams_department ON teams(department_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_leave_user ON leave_requests(user_id);
CREATE INDEX idx_leave_status ON leave_requests(status);
CREATE INDEX idx_announcements_department ON announcements(department_id);
CREATE INDEX idx_documents_owner ON documents(owner_id);
CREATE INDEX idx_documents_visibility ON documents(visibility);
CREATE INDEX idx_documents_department ON documents(department_id);
CREATE INDEX idx_documents_team ON documents(team_id);

-- ---------- 13. SEED DEFAULT DEPARTMENTS + A CORE TEAM EACH ----------
INSERT INTO departments (name, description) VALUES
  ('Executive', 'Company leadership and strategy'),
  ('Engineering', 'Full-stack, mobile, and platform development'),
  ('DevOps & QA', 'Infrastructure, deployment, and quality assurance'),
  ('AI/ML', 'AI integration, NLP, and machine learning work'),
  ('Design & Branding', 'UI/UX, product design, and brand identity'),
  ('Human Resources', 'Recruitment, onboarding, and team operations'),
  ('Business & Growth', 'Client acquisition, partnerships, and strategy');

INSERT INTO teams (name, department_id)
SELECT 'Core Team', d.id FROM departments d;

-- ---------- 14. DISABLE ROW LEVEL SECURITY ----------
-- Auth in this app is a local JWT system (lib/auth.ts), not Supabase
-- Auth, so auth.uid() is never populated — RLS would have nothing to
-- check against. All access control happens inside the Next.js API
-- routes using the service_role key, which never reaches the browser.
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

-- =============================================================
-- Fresh install complete. Next steps:
-- 1. Supabase → Storage → New bucket → "orbit-documents" → Private
-- 2. Supabase → Storage → New bucket → "orbit-avatars" → Public
-- 3. Copy Project URL + service_role key into .env.local /
--    Vercel env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
-- 4. Visit /register on your deployed site and create your account —
--    the FIRST person to register automatically becomes admin.
-- 5. From Team, promote yourself/co-founder to ceo/cto, etc.
-- =============================================================
