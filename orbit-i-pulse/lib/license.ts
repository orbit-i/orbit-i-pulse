// lib/license.ts
// =============================================================
// ORBIT-I PULSE — WHITE-LABEL LICENSE VALIDATION
// =============================================================
// Deliberately ASYMMETRIC (RSA-SHA256 via the standard Web Crypto
// API), not a shared-secret HMAC. Every deployment ships with the
// same PUBLIC key (safe to expose — it can only verify signatures,
// never create them). Only you, the seller, hold the PRIVATE key (on
// your own machine, never committed, never shipped to a buyer). That
// means a buyer can read 100% of this source code and still cannot
// forge a valid license for themselves or anyone else.
//
// Uses Web Crypto (`crypto.subtle`) rather than Node's `crypto`
// module on purpose: this file runs inside Next.js Middleware, which
// executes on the Edge runtime, not full Node.js — Web Crypto is the
// one signing API that works reliably in both places.
//
// License key format (the value you hand a buyer as their env var):
//   base64url(JSON payload) + "." + base64url(RSA signature)
//
// Payload shape:
//   { licensedTo: string, licenseId: string, issuedAt: string, plan: "lifetime" }
// =============================================================

export type LicensePayload = {
  licensedTo: string;
  licenseId: string;
  issuedAt: string;
  plan: string;
};

export type LicenseCheck =
  | { valid: true; payload: LicensePayload }
  | { valid: false; reason: string };

function b64urlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function pemToDer(pem: string): Uint8Array {
  const clean = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Verifies a license key string against the deployment's public key.
 * Both come from env vars so the same code works for every white-label
 * customer — only the values differ per deployment. Async because
 * Web Crypto's verify is promise-based.
 */
export async function checkLicense(): Promise<LicenseCheck> {
  const licenseKey = process.env.LICENSE_KEY;
  const publicKeyPem = process.env.LICENSE_PUBLIC_KEY;

  // Licensing is OPT-IN per deployment. If you haven't set a public key,
  // this is your own internal/dev instance (or you've chosen not to
  // license-gate it) — never lock yourself out for forgetting an env var.
  // Licensing only activates once you deliberately configure
  // LICENSE_PUBLIC_KEY on a deployment you're selling to a client.
  if (!publicKeyPem) {
    return { valid: true, payload: { licensedTo: "Unlicensed (internal use)", licenseId: "none", issuedAt: "", plan: "internal" } };
  }

  if (!licenseKey) return { valid: false, reason: "No LICENSE_KEY environment variable is set." };

  const parts = licenseKey.trim().split(".");
  if (parts.length !== 2) return { valid: false, reason: "License key is malformed." };
  const [payloadB64, sigB64] = parts;

  let payload: LicensePayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadB64)));
  } catch {
    return { valid: false, reason: "License payload could not be parsed." };
  }

  try {
    const keyData = pemToDer(publicKeyPem);
    const publicKey = await crypto.subtle.importKey(
      "spki",
      keyData.buffer.slice(keyData.byteOffset, keyData.byteOffset + keyData.byteLength) as ArrayBuffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signature = b64urlToBytes(sigB64);
    const message = new TextEncoder().encode(payloadB64);
    const isValid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      signature.buffer.slice(signature.byteOffset, signature.byteOffset + signature.byteLength) as ArrayBuffer,
      message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength) as ArrayBuffer
    );
    if (!isValid) return { valid: false, reason: "License signature does not match. This key was not issued by ORBIT-I." };
  } catch (e: any) {
    return { valid: false, reason: `Could not verify license: ${e.message}` };
  }

  if (!payload.licensedTo || !payload.licenseId) {
    return { valid: false, reason: "License payload is missing required fields." };
  }

  return { valid: true, payload };
}

/** Lightweight boolean helper for places that don't need the reason/payload. */
export async function isLicensed(): Promise<boolean> {
  return (await checkLicense()).valid;
}
