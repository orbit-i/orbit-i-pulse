// lib/reg-number.ts
// Validates the ORBIT-I registration number format issued on offer
// letters: REG/ORBIT-I/26/0030 — REG / brand / 2-digit year / 4-digit seq.
// The person types this themselves; we only validate the shape here.

const REG_NUMBER_PATTERN = /^REG\/ORBIT-I\/\d{2}\/\d{3,5}$/i;

export function isValidRegistrationNumber(value: string): boolean {
  return REG_NUMBER_PATTERN.test(value.trim());
}

export function normalizeRegistrationNumber(value: string): string {
  return value.trim().toUpperCase();
}

export const REG_NUMBER_EXAMPLE = "REG/ORBIT-I/26/0030";
export const REG_NUMBER_HELP =
  "Found on your ORBIT-I offer letter, e.g. REG/ORBIT-I/26/0030";
