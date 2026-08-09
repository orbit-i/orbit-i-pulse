// lib/csv.ts
// Minimal CSV builder — no external dependency needed at this scale.
export function toCsv(
  rows: Record<string, any>[],
  columns: { key: string; label: string }[]
): string {
  const escape = (val: any) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const header = columns.map((c) => escape(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escape(row[c.key])).join(","));
  return [header, ...lines].join("\n");
}
