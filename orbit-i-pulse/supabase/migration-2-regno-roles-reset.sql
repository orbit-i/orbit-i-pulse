-- =============================================================
-- ORBIT-I PULSE — MIGRATION 2
-- Adds: registration number, expanded roles, self-serve password
-- reset fields, late/early attendance flags.
--
-- Run this ONCE in the Supabase SQL editor, AFTER schema.sql has
-- already been run. Safe to run on an existing populated database —
-- it only ADDS columns/constraints, nothing is dropped.
-- =============================================================

-- ---------- 1. Expand role CHECK constraint ----------
-- Old roles: admin, manager, intern
-- New roles: admin, manager, intern, employee, core_team_member
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'manager', 'intern', 'employee', 'core_team_member'));

-- ---------- 2. Registration number ----------
-- Format: REG/ORBIT-I/26/0030  (issued to the person on their offer
-- letter — they type it themselves at registration, we don't generate it).
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_number VARCHAR(60) UNIQUE;

-- ---------- 3. Self-serve password reset (no email provider needed) ----------
-- The person sets a security question + answer at registration, then
-- uses email + registration number + answer to set a new password
-- later without needing an email link.
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_question TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer_hash TEXT;

-- ---------- 4. Late / early-leave flags on attendance ----------
-- check_in after 9:00 AM PKT = late. check_out before 5:00 PM PKT = early leave.
-- Stored explicitly (rather than computed each time) so historical
-- records keep using the policy that was active when logged.
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_early_leave BOOLEAN DEFAULT false;

-- ---------- Done ----------
-- Next: redeploy the app. Existing users will have NULL
-- registration_number / security_question until they re-save their
-- profile or you backfill manually.
