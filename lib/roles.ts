// lib/roles.ts
// SINGLE SOURCE OF TRUTH for valid roles.
export const ALL_ROLES = [
  "admin",
  "ceo",
  "cto",
  "hr_manager",
  "associate_hr",
  "manager",
  "team_lead",
  "team_member",
  "employee",
  "intern",
  "core_team_member",
] as const;

export type Role = (typeof ALL_ROLES)[number];

export const PRIMARY_ROLES: Role[] = ["admin", "ceo", "cto", "hr_manager", "manager", "team_lead", "team_member", "intern"];
export const SECONDARY_ROLES: Role[] = ["associate_hr", "employee", "core_team_member"];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  ceo: "CEO",
  cto: "CTO",
  hr_manager: "HR Manager",
  associate_hr: "Associate HR",
  manager: "Manager",
  team_lead: "Team Lead",
  team_member: "Team Member",
  employee: "Employee",
  intern: "Intern",
  core_team_member: "Core Team Member",
};

export const ROLE_SHORT_LABELS: Record<Role, string> = {
  admin: "Admin",
  ceo: "CEO",
  cto: "CTO",
  hr_manager: "HR Mgr",
  associate_hr: "Assoc. HR",
  manager: "Manager",
  team_lead: "Lead",
  team_member: "Member",
  employee: "Employee",
  intern: "Intern",
  core_team_member: "Core Team",
};

export const ROLE_LEVEL: Record<Role, number> = {
  admin: 100,
  ceo: 95,
  cto: 90,
  hr_manager: 70,
  manager: 60,
  team_lead: 50,
  associate_hr: 45,
  team_member: 30,
  employee: 30,
  core_team_member: 30,
  intern: 10,
};

export const EXECUTIVE_ROLES: Role[] = ["admin", "ceo", "cto"];
export const HR_ROLES: Role[] = ["hr_manager", "associate_hr"];
export const PEOPLE_MANAGER_ROLES: Role[] = ["admin", "ceo", "cto", "manager", "team_lead", "hr_manager"];
export const INDIVIDUAL_CONTRIBUTOR_ROLES: Role[] = ["team_member", "employee", "core_team_member", "intern"];

export function isValidRole(value: string): value is Role {
  return (ALL_ROLES as readonly string[]).includes(value);
}
export function roleLevel(role: string): number {
  return isValidRole(role) ? ROLE_LEVEL[role] : 0;
}
export function isExecutive(role: string): boolean {
  return EXECUTIVE_ROLES.includes(role as Role);
}
export function isHR(role: string): boolean {
  return HR_ROLES.includes(role as Role);
}
export function isPeopleManager(role: string): boolean {
  return PEOPLE_MANAGER_ROLES.includes(role as Role);
}
