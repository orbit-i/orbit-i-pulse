// scripts/bootstrap-admin.mjs
// =============================================================
// OPTIONAL. Run once per new client deployment: npm run bootstrap-admin
// =============================================================
// As of the current version, registration is open (no invite code
// required) and the FIRST account ever created automatically
// becomes admin — so in most cases you can skip this script and
// just register normally as the first user.
//
// Use this script instead if you want to create the admin account
// yourself (e.g. with a specific email/password) WITHOUT exposing
// that step to whoever opens the live site first.
//
// Run this LOCALLY, pointed at the client's Supabase project via
// .env.local.
// =============================================================

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import readline from "readline";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

function askHidden(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    let input = "";
    const onData = (char) => {
      if (char === "\n" || char === "\r" || char === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(input);
      } else if (char === "\u0003") {
        process.exit(1);
      } else if (char === "\u007f") {
        input = input.slice(0, -1);
      } else {
        input += char;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  console.log("=== ORBIT-I Pulse — Bootstrap First Admin Account ===\n");

  const { data: existingAdmins, error: checkErr } = await supabase
    .from("users")
    .select("id, email")
    .eq("role", "admin")
    .limit(1);

  if (checkErr) {
    console.error("❌ Could not reach Supabase. Check your URL/key in .env.local.", checkErr.message);
    process.exit(1);
  }

  if (existingAdmins && existingAdmins.length > 0) {
    console.log(`⚠️  An admin already exists (${existingAdmins[0].email}).`);
    const proceed = await ask("Create another admin anyway? (y/N): ");
    if (proceed.toLowerCase() !== "y") {
      console.log("Aborted.");
      process.exit(0);
    }
  }

  const fullName = await ask("Full name: ");
  const email = (await ask("Email: ")).trim().toLowerCase();
  const password = await askHidden("Password (min 8 chars): ");
  const registrationNumber = (await ask("Registration number (optional, e.g. REG/ORBIT-I/26/0001): ")).trim();
  const securityQuestion = (await ask("Security question (optional, for self-serve password reset): ")).trim();
  const securityAnswer = securityQuestion ? await askHidden("Security answer: ") : "";

  if (!fullName || !email || !password) {
    console.error("❌ All fields are required.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("❌ Password must be at least 8 characters.");
    process.exit(1);
  }

  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingUser) {
    console.error("❌ A user with this email already exists.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const securityAnswerHash = securityAnswer ? await bcrypt.hash(securityAnswer.trim().toLowerCase(), 12) : null;

  const { data: newAdmin, error } = await supabase
    .from("users")
    .insert({
      full_name: fullName,
      email,
      password_hash: passwordHash,
      role: "admin",
      registration_number: registrationNumber || null,
      security_question: securityQuestion || null,
      security_answer_hash: securityAnswerHash,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ Failed to create admin:", error.message);
    process.exit(1);
  }

  console.log("\n✅ Admin account created successfully!");
  console.log(`   Name:  ${newAdmin.full_name}`);
  console.log(`   Email: ${newAdmin.email}`);
  if (!securityQuestion) {
    console.log("\n⚠️  No security question set — this admin can't use self-serve");
    console.log("   password reset until they set one (e.g. via Supabase directly).");
  }
  console.log("\nYou can now log in from the Login page.");
  process.exit(0);
}

main();
