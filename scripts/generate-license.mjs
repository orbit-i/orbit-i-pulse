// scripts/generate-license.mjs
// =============================================================
// Run this ON YOUR OWN COMPUTER every time you sell ORBIT-I Pulse to
// a new client. Requires license-keys/private.pem to exist (created
// once by scripts/generate-license-keypair.mjs).
//
//   node scripts/generate-license.mjs "Client Company Name" [plan]
//
// Example:
//   node scripts/generate-license.mjs "Avalon AI" lifetime
//
// Prints a LICENSE_KEY string. Give that value to the client to set
// as their LICENSE_KEY environment variable in Vercel (or wherever
// they deploy). They also need LICENSE_PUBLIC_KEY set to the SAME
// public key every deployment uses (see license-keys/public.pem).
// =============================================================
import { readFileSync, existsSync, mkdirSync, appendFileSync } from "fs";
import { sign as nodeSign, randomUUID } from "crypto";

const clientName = process.argv[2];
const plan = process.argv[3] || "lifetime";

if (!clientName) {
  console.log("\nUsage: node scripts/generate-license.mjs \"Client Company Name\" [plan]\n");
  process.exit(1);
}

const privateKeyPath = "license-keys/private.pem";
if (!existsSync(privateKeyPath)) {
  console.log(`\n❌ ${privateKeyPath} not found.`);
  console.log("   Run scripts/generate-license-keypair.mjs first (once, ever).\n");
  process.exit(1);
}

const privateKeyPem = readFileSync(privateKeyPath, "utf8");

const payload = {
  licensedTo: clientName,
  licenseId: randomUUID(),
  issuedAt: new Date().toISOString(),
  plan,
};

const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
const signature = nodeSign("sha256", Buffer.from(payloadB64, "utf8"), {
  key: privateKeyPem,
  padding: 1, // RSA_PKCS1_PADDING (matches RSASSA-PKCS1-v1_5 on the verify side)
});
const sigB64 = signature.toString("base64url");

const licenseKey = `${payloadB64}.${sigB64}`;

console.log("\n✅ License generated for:", clientName);
console.log("   License ID:", payload.licenseId);
console.log("   Plan:", plan);
console.log("\n--- Give the client this LICENSE_KEY value ---\n");
console.log(licenseKey);
console.log("\n-----------------------------------------------\n");
console.log("They set two env vars on their deployment:");
console.log("  LICENSE_KEY        = the value printed above");
console.log("  LICENSE_PUBLIC_KEY = the contents of license-keys/public.pem (same for every client)\n");

// Keep a local paper trail of every license you've ever issued.
mkdirSync("license-keys", { recursive: true });
appendFileSync(
  "license-keys/issued-licenses.log",
  `${payload.issuedAt}\t${payload.licenseId}\t${clientName}\t${plan}\n`
);
console.log("(Logged to license-keys/issued-licenses.log for your records.)\n");
