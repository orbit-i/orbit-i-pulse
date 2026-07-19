// components/ui-bits.tsx
// Small shared presentational pieces used across dashboard pages:
// role/status badges, initials avatar, and a read-only star display.
import { StarIcon } from "@/components/icons";
import { ROLE_LABELS, type Role } from "@/lib/roles";

export function initials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return <div className={`avatar ${size === "sm" ? "avatar-sm" : ""}`}>{initials(name)}</div>;
}

const ROLE_BADGE_VARIANT: Record<string, string> = {
  admin: "badge-primary",
  ceo: "badge-primary",
  cto: "badge-primary",
  hr_manager: "badge-warning",
  associate_hr: "badge-warning",
  manager: "badge-info",
  team_lead: "badge-info",
  team_member: "badge-neutral",
  employee: "badge-neutral",
  core_team_member: "badge-neutral",
  intern: "badge-success",
};

export function RoleBadge({ role }: { role: string }) {
  const variant = ROLE_BADGE_VARIANT[role] || "badge-neutral";
  const label = ROLE_LABELS[role as Role] || role;
  return (
    <span className={`badge ${variant}`}>
      <span className="badge-dot" />
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    present: "badge-success",
    late: "badge-warning",
    half_day: "badge-warning",
    absent: "badge-danger",
    pending: "badge-warning",
    reviewed: "badge-success",
    active: "badge-success",
    inactive: "badge-neutral",
  };
  const label = status.replace("_", " ");
  return (
    <span className={`badge ${map[status] || "badge-neutral"}`}>
      <span className="badge-dot" />
      {label}
    </span>
  );
}

export function StarDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="star-row" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} size={size} filled={n <= rating} className={n <= rating ? "filled" : ""} />
      ))}
    </span>
  );
}
