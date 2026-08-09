// lib/timezones.ts
export const TIMEZONE_GROUPS: { label: string; zones: { value: string; label: string }[] }[] = [
  {
    label: "Asia",
    zones: [
      { value: "Asia/Karachi", label: "Karachi (PKT, UTC+5)" },
      { value: "Asia/Kolkata", label: "New Delhi / Mumbai (IST, UTC+5:30)" },
      { value: "Asia/Dhaka", label: "Dhaka (UTC+6)" },
      { value: "Asia/Dubai", label: "Dubai (UTC+4)" },
      { value: "Asia/Riyadh", label: "Riyadh (UTC+3)" },
      { value: "Asia/Istanbul", label: "Istanbul (UTC+3)" },
      { value: "Asia/Shanghai", label: "Shanghai / Beijing (UTC+8)" },
      { value: "Asia/Hong_Kong", label: "Hong Kong (UTC+8)" },
      { value: "Asia/Singapore", label: "Singapore (UTC+8)" },
      { value: "Asia/Tokyo", label: "Tokyo (UTC+9)" },
      { value: "Asia/Seoul", label: "Seoul (UTC+9)" },
      { value: "Asia/Jakarta", label: "Jakarta (UTC+7)" },
      { value: "Asia/Bangkok", label: "Bangkok (UTC+7)" },
    ],
  },
  {
    label: "Middle East & Africa",
    zones: [
      { value: "Africa/Cairo", label: "Cairo (UTC+2)" },
      { value: "Africa/Lagos", label: "Lagos (UTC+1)" },
      { value: "Africa/Johannesburg", label: "Johannesburg (UTC+2)" },
      { value: "Asia/Jerusalem", label: "Jerusalem (UTC+2)" },
      { value: "Asia/Qatar", label: "Doha (UTC+3)" },
    ],
  },
  {
    label: "Europe",
    zones: [
      { value: "Europe/London", label: "London (GMT/BST)" },
      { value: "Europe/Paris", label: "Paris / Berlin / Madrid (CET)" },
      { value: "Europe/Moscow", label: "Moscow (UTC+3)" },
      { value: "Europe/Athens", label: "Athens (UTC+2)" },
    ],
  },
  {
    label: "Americas",
    zones: [
      { value: "America/New_York", label: "New York (Eastern, ET)" },
      { value: "America/Chicago", label: "Chicago (Central, CT)" },
      { value: "America/Denver", label: "Denver (Mountain, MT)" },
      { value: "America/Los_Angeles", label: "Los Angeles (Pacific, PT)" },
      { value: "America/Toronto", label: "Toronto (ET)" },
      { value: "America/Sao_Paulo", label: "São Paulo (UTC-3)" },
      { value: "America/Mexico_City", label: "Mexico City (UTC-6)" },
    ],
  },
  {
    label: "Oceania",
    zones: [
      { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
      { value: "Australia/Perth", label: "Perth (UTC+8)" },
      { value: "Pacific/Auckland", label: "Auckland (UTC+12/13)" },
    ],
  },
  {
    label: "Global",
    zones: [{ value: "UTC", label: "UTC (Coordinated Universal Time)" }],
  },
];

export const ALL_TIMEZONES = TIMEZONE_GROUPS.flatMap((g) => g.zones);

export function timezoneLabel(value: string): string {
  return ALL_TIMEZONES.find((z) => z.value === value)?.label || value;
}

/** Local calendar date (YYYY-MM-DD) for a given instant, in a given IANA timezone. */
export function localDateInTimezone(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Formats a UTC instant as a clock time in the given timezone, e.g. "09:14 AM". */
export function formatTimeInTimezone(iso: string | null, timezone: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleTimeString();
  }
}
