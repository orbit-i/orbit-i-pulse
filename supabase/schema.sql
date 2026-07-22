-- =============================================================
-- ORBIT-I PULSE — DATABASE SCHEMA (PostgreSQL / Supabase)
-- =============================================================
-- Run this ENTIRE file once in the Supabase SQL Editor for each
-- new client project, BEFORE deploying the app or running the
-- bootstrap-admin script.
--
-- IMPORTANT: This schema intentionally disables Row Level Security
-- (RLS) on every table. Authentication in this app is handled by
-- a local JWT system (see lib/auth.ts), NOT Supabase Auth, so
-- auth.uid() is never populated and RLS policies would have nothing
-- to check against. All access control is enforced inside the
-- Next.js API routes using the Supabase service_role key, which is
-- server-side only and never exposed to the browser.
-- =============================================================

-- ---------- USERS ----------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,        -- bcrypt hash, NOT Supabase auth
  role VARCHAR(20) NOT NULL DEFAULT 'intern' CHECK (role IN ('admin','manager','intern','employee','core_team_member')),
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  avatar_url TEXT,
  department VARCHAR(100),
  -- Issued to each person on their offer letter, e.g. REG/ORBIT-I/26/0030.
  -- They type it themselves at registration — not auto-generated.
  registration_number VARCHAR(60) UNIQUE,
  -- Self-serve password reset (no email provider required): person sets
  -- a security question/answer at registration, uses it later to reset.
  security_question TEXT,
  security_answer_hash TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- ATTENDANCE ----------
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ,
  check_in_ip VARCHAR(45),
  check_out_ip VARCHAR(45),
  status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present','late','half_day','absent')),
  -- Office hours policy: check-in expected by 9:00 AM PKT, check-out from 5:00 PM PKT.
  is_late BOOLEAN DEFAULT false,
  is_early_leave BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- One attendance record per user per calendar day
ALTER TABLE attendance ADD COLUMN check_in_date DATE GENERATED ALWAYS AS ((check_in AT TIME ZONE 'UTC')::date) STORED;
CREATE UNIQUE INDEX idx_attendance_user_date ON attendance(user_id, check_in_date);

-- ---------- DAILY REPORTS ----------
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

-- ---------- PERFORMANCE REVIEWS ----------
CREATE TABLE performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- COMPANY SETTINGS (single row, optional use) ----------
CREATE TABLE company_settings (
  id INT PRIMARY KEY DEFAULT 1,
  company_name VARCHAR(150) NOT NULL,
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#4F46E5',
  secondary_color VARCHAR(7) DEFAULT '#1E293B',
  admin_email VARCHAR(150) NOT NULL,
  CHECK (id = 1)
);

-- ---------- INDEXES ----------
CREATE INDEX idx_attendance_user ON attendance(user_id);
CREATE INDEX idx_reports_user ON daily_reports(user_id);
CREATE INDEX idx_reviews_report ON performance_reviews(report_id);
CREATE INDEX idx_users_manager ON users(manager_id);
CREATE INDEX idx_users_registration_number ON users(registration_number);

-- ---------- DISABLE ROW LEVEL SECURITY ----------
-- See note at top of file for why this is correct for this app's
-- local-JWT auth model. Do NOT enable RLS unless you also migrate
-- auth to Supabase Auth and rewrite every API route accordingly.
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;

-- =============================================================
-- Schema complete. Next steps:
-- 1. Copy your Project URL and service_role key from
--    Supabase Project Settings -> API into .env.local
-- 2. Run: npm run bootstrap-admin
-- =============================================================
