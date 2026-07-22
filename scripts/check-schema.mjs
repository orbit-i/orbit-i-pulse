// scripts/check-schema.mjs
// Run: node scripts/check-schema.mjs
// Quick diagnostic — confirms your .env.local is correct AND that
// the database schema has actually been run on your Supabase
// project. Use this before npm run bootstrap-admin or npm run dev
// if you're not sure what's wrong.

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET"];
let missing = false;

console.log("=== ORBIT-I Pulse — Environment & Schema Check ===\n");

for (const key of required) {
  if (!process.env[key]) {
    console.log(`❌ ${key} is MISSING from .env.local`);
    missing = true;
  } else {
    console.log(`✅ ${key} is set`);
  }
}

if (missing) {
  console.log("\n❌ Fix the missing variables above before continuing.");
  console.log("   See .env.example for the full list and where each value comes from.");
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const tables = ["users", "attendance", "daily_reports", "performance_reviews", "company_settings"];
console.log("\nChecking database tables...");

let allTablesOk = true;
for (const table of tables) {
  const { error } = await supabase.from(table).select("*").limit(1);
  if (error) {
    console.log(`❌ Table "${table}" — ${error.message}`);
    allTablesOk = false;
  } else {
    console.log(`✅ Table "${table}" exists and is reachable`);
  }
}

if (!allTablesOk) {
  console.log("\n❌ One or more tables are missing.");
  console.log("   Open your Supabase project -> SQL Editor, paste the full");
  console.log("   contents of supabase/schema.sql, and click Run. Then re-run");
  console.log("   this check.");
  process.exit(1);
}

// Column-level check: registration_number, security_question, and
// is_late/is_early_leave were added in migration-2. An existing
// Supabase project from before that migration will have the tables
// above (so the check passes) but will be missing these specific
// columns, and every register/login request will fail with a
// "column does not exist" error until the migration is run.
console.log("\nChecking for migration-2 columns (registration number, password reset, late flags)...");
const { error: regNumberErr } = await supabase.from("users").select("registration_number, security_question").limit(1);
const { error: lateFlagErr } = await supabase.from("attendance").select("is_late, is_early_leave").limit(1);

let migrationOk = true;
if (regNumberErr) {
  console.log(`❌ users.registration_number / security_question — ${regNumberErr.message}`);
  migrationOk = false;
} else {
  console.log("✅ users.registration_number / security_question exist");
}
if (lateFlagErr) {
  console.log(`❌ attendance.is_late / is_early_leave — ${lateFlagErr.message}`);
  migrationOk = false;
} else {
  console.log("✅ attendance.is_late / is_early_leave exist");
}

if (!migrationOk) {
  console.log("\n❌ Your database is missing the migration-2 columns.");
  console.log("   Open your Supabase project -> SQL Editor, paste the full");
  console.log("   contents of supabase/migration-2-regno-roles-reset.sql,");
  console.log("   and click Run. Then re-run this check.");
  process.exit(1);
}

// migration-3: departments/tasks/leave_requests/announcements tables +
// the expanded role set (ceo, cto, hr_manager, associate_hr, team_lead).
console.log("\nChecking for migration-3 tables (departments, tasks, leave_requests, announcements)...");
const migration3Tables = ["departments", "tasks", "leave_requests", "announcements"];
let migration3Ok = true;
for (const table of migration3Tables) {
  const { error } = await supabase.from(table).select("*").limit(1);
  if (error) {
    console.log(`❌ Table "${table}" — ${error.message}`);
    migration3Ok = false;
  } else {
    console.log(`✅ Table "${table}" exists`);
  }
}
if (!migration3Ok) {
  console.log("\n❌ Your database is missing migration-3.");
  console.log("   Open Supabase -> SQL Editor, paste the full contents of");
  console.log("   supabase/migration-3-workspace-expansion.sql, and click Run.");
  console.log("   Then re-run this check.");
  process.exit(1);
}

// migration-4: phone/job_title/avatar_url/team_id on users, plus the
// teams and documents tables. This is exactly the gap that causes the
// Team/Departments/My Profile pages to render as empty/blank in the UI
// with no visible error, if the API silently swallows the column error.
console.log("\nChecking for migration-4 columns and tables (profiles, teams, documents)...");
const { error: profileColsErr } = await supabase.from("users").select("phone, job_title, avatar_url, team_id").limit(1);
const { error: teamsErr } = await supabase.from("teams").select("*").limit(1);
const { error: docsErr } = await supabase.from("documents").select("*").limit(1);

let migration4Ok = true;
if (profileColsErr) {
  console.log(`❌ users.phone / job_title / avatar_url / team_id — ${profileColsErr.message}`);
  migration4Ok = false;
} else {
  console.log("✅ users.phone / job_title / avatar_url / team_id exist");
}
if (teamsErr) {
  console.log(`❌ Table "teams" — ${teamsErr.message}`);
  migration4Ok = false;
} else {
  console.log('✅ Table "teams" exists');
}
if (docsErr) {
  console.log(`❌ Table "documents" — ${docsErr.message}`);
  migration4Ok = false;
} else {
  console.log('✅ Table "documents" exists');
}

if (!migration4Ok) {
  console.log("\n❌ Your database is missing migration-4.");
  console.log("   This is why Team / Departments / My Profile can show up empty");
  console.log("   in the app with no error message.");
  console.log("   Open Supabase -> SQL Editor, paste the full contents of");
  console.log("   supabase/migration-4-profiles-teams-documents.sql, and click Run.");
  console.log("   Then re-run this check.");
  process.exit(1);
}

console.log("\n✅ All checks passed. You can now run: npm run bootstrap-admin");
console.log("   (or just register the first account in the app — it becomes admin automatically)");
process.exit(0);
