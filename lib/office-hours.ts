// lib/office-hours.ts
// Single source of truth for the 9:00 AM – 5:00 PM (Asia/Karachi) office
// hours policy, so attendance check-in/out always agree on what
// "late" and "early leave" mean — no matter what server timezone
// Vercel happens to run in.

const TIMEZONE = "Asia/Karachi";
const CHECK_IN_HOUR = 9; // 9:00 AM
const CHECK_OUT_HOUR = 17; // 5:00 PM

/**
 * Returns the current wall-clock hour/minute in Asia/Karachi,
 * regardless of the server's actual timezone (Vercel runs in UTC).
 */
function getKarachiHourMinute(date: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  // Intl can return "24" for midnight in some environments — normalize.
  return { hour: hour === 24 ? 0 : hour, minute };
}

export function isLateCheckIn(date: Date = new Date()): boolean {
  const { hour, minute } = getKarachiHourMinute(date);
  return hour > CHECK_IN_HOUR || (hour === CHECK_IN_HOUR && minute > 0);
}

export function isEarlyCheckOut(date: Date = new Date()): boolean {
  const { hour } = getKarachiHourMinute(date);
  return hour < CHECK_OUT_HOUR;
}

export const OFFICE_HOURS_LABEL = "9:00 AM – 5:00 PM (PKT)";
