// scripts/generate-license-keypair.mjs
// =============================================================
// RUN THIS ONCE, EVER — on YOUR OWN computer, not in any client's
// repo or deployment. It creates your master signing keypair.
//
//   node scripts/generate-license-keypair.mjs
//
// Output:
//   license-keys/private.pem  <-- KEEP THIS SECRET. Never commit it,
//                                  never send it to a buyer, never put
//                                  it in a deployed env var. This is
//                                  what lets YOU (and only you) issue
//                                  valid licenses. If someone else gets
//                                  this file, they can generate
//                                  "genuine" licenses too.
//   license-keys/public.pem   <-- Safe to embed in EVERY deployment
//                                  (as the LICENSE_PUBLIC_KEY env var).
//                                  It can only verify signatures, not
//                                  create them.
//
// The license-keys/ folder is already in .gitignore so you don't
// accidentally commit your private key.
// =============================================================
import { generateKeyPairSync } from "crypto";
import { mkdirSync, writeFileSync, existsSync } from "fs";

const dir = "license-keys";
if (existsSync(`${dir}/private.pem`)) {
  console.log(`\n⚠️  ${dir}/private.pem already exists.`);
  console.log("   Refusing to overwrite it — that would invalidate every");
  console.log("   license you've already issued. Delete it manually first");
  console.log("   if you really want a new master keypair.\n");
  process.exit(1);
}

mkdirSync(dir, { recursive: true });

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });

writeFileSync(`${dir}/private.pem`, privateKey.export({ type: "pkcs8", format: "pem" }));
writeFileSync(`${dir}/public.pem`, publicKey.export({ type: "spki", format: "pem" }));

console.log("\n✅ Master signing keypair created:");
console.log(`   ${dir}/private.pem  (KEEP SECRET — never share, never commit)`);
console.log(`   ${dir}/public.pem   (safe to put in every deployment)\n`);
console.log("Next steps:");
console.log("1. Copy the contents of public.pem into every deployment's");
console.log("   LICENSE_PUBLIC_KEY environment variable (same value every time).");
console.log("2. Run scripts/generate-license.mjs whenever you sell to a new client.");
console.log("3. Back up private.pem somewhere safe outside this project folder.\n");
