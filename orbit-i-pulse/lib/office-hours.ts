// lib/office-hours.ts
// Single source of truth for the 9:00 AM – 5:00 PM office hours
// policy. Now timezone-aware per person — a "late" check-in means
// late relative to THAT person's own local 9:00 AM, not a single
// fixed company timezone. This is what makes the product usable for
// a distributed/global team (Asia, US, Europe, anywhere).
const CHECK_IN_HOUR = 9; // 9:00 AM
const CHECK_OUT_HOUR = 17; // 5:00 PM
export const DEFAULT_TIMEZONE = "Asia/Karachi";

function getHourMinuteInTimezone(date: Date, timezone: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  // Intl can return "24" for midnight in some environments — normalize.
  return { hour: hour === 24 ? 0 : hour, minute };
}

export function isLateCheckIn(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): boolean {
  const { hour, minute } = getHourMinuteInTimezone(date, timezone);
  return hour > CHECK_IN_HOUR || (hour === CHECK_IN_HOUR && minute > 0);
}

export function isEarlyCheckOut(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): boolean {
  const { hour } = getHourMinuteInTimezone(date, timezone);
  return hour < CHECK_OUT_HOUR;
}

export const OFFICE_HOURS_LABEL = "9:00 AM – 5:00 PM (your local time)";
