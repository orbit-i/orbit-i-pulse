// lib/twofactor.ts
// Self-contained TOTP (RFC 6238) implementation using Node's built-in
// crypto — no third-party auth library needed (otplib v13 requires a
// plugin-based setup that adds unnecessary complexity for a standard
// 30-second, 6-digit, SHA1 TOTP, which is what every authenticator
// app — Google Authenticator, Authy, 1Password — expects by default).
import { createHmac, randomBytes } from "crypto";
import QRCode from "qrcode";
import { appConfig } from "@/config";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

/** Verifies a 6-digit code, allowing +/-1 time step for clock drift. */
export function verifyToken(token: string, base32Secret: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  const secret = base32Decode(base32Secret);
  const counter = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  for (const drift of [0, -1, 1]) {
    if (hotp(secret, counter + drift) === token) return true;
  }
  return false;
}

export async function generateQrCodeDataUrl(email: string, base32Secret: string): Promise<string> {
  const issuer = encodeURIComponent(appConfig.legalName);
  const label = encodeURIComponent(email);
  const otpauth = `otpauth://totp/${issuer}:${label}?secret=${base32Secret}&issuer=${issuer}&digits=${DIGITS}&period=${STEP_SECONDS}`;
  return QRCode.toDataURL(otpauth);
}
