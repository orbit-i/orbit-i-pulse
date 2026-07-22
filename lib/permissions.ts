// lib/permissions.ts
// Central capability checks for the expanded org hierarchy.
// Keep every "can this role do X" question here — API routes and
// pages both import from this file so authorization logic never
// drifts between the frontend gate and the backend enforcement.
import { type Role, isValidRole, EXECUTIVE_ROLES, HR_ROLES } from "./roles";

export function canManageUsers(role: string): boolean {
  return ["admin", "ceo", "cto", "hr_manager"].includes(role);
}

export function canChangeRoles(role: string): boolean {
  // Only the system owner and the two founders can re-org people.
  return ["admin", "ceo", "cto"].includes(role);
}

export function canManageDepartments(role: string): boolean {
  return ["admin", "ceo", "cto", "hr_manager"].includes(role);
}

export function canViewAllAttendance(role: string): boolean {
  return ["admin", "ceo", "cto", "hr_manager", "associate_hr", "manager"].includes(role);
}

export function canViewFullDirectory(role: string): boolean {
  // Everyone can see the org chart/directory — it's a workspace, not a secret.
  return isValidRole(role);
}

// Can approve/reject leave requests submitted by others
export function canApproveLeave(role: string): boolean {
  return ["admin", "ceo", "cto", "hr_manager", "associate_hr", "manager", "team_lead"].includes(role);
}

// Can assign tasks to other people (vs. only managing their own)
export function canAssignTasks(role: string): boolean {
  return ["admin", "ceo", "cto", "hr_manager", "manager", "team_lead"].includes(role);
}

// Can review/rate daily reports submitted by others
export function canReviewReports(role: string): boolean {
  return ["admin", "ceo", "cto", "hr_manager", "manager", "team_lead"].includes(role);
}

// Can post company-wide announcements to the workspace feed
export function canPostAnnouncements(role: string): boolean {
  return ["admin", "ceo", "cto", "hr_manager"].includes(role);
}

// Can create/edit/delete Teams (nested under a Department)
export function canManageTeams(role: string): boolean {
  return ["admin", "ceo", "cto", "hr_manager", "manager"].includes(role);
}

// Can upload/share a document into team/department/company visibility
// (everyone can always create PRIVATE documents in their own workspace)
export function canShareBeyondPrivate(role: string): boolean {
  return true; // any signed-in person can share to their own team/department
}

// Can post to company-wide document visibility specifically
export function canShareCompanyWide(role: string): boolean {
  return ["admin", "ceo", "cto", "hr_manager", "manager", "team_lead"].includes(role);
}

export function isExecutiveRole(role: string): boolean {
  return (EXECUTIVE_ROLES as readonly string[]).includes(role);
}

export function isHRRole(role: string): boolean {
  return (HR_ROLES as readonly string[]).includes(role);
}

// Which workspace "lane" a role's dashboard home should render.
// Used purely for UI branching (which widgets show first), never
// for security — API routes still enforce their own checks.
export type WorkspaceLane = "executive" | "hr" | "leadership" | "individual";

export function workspaceLane(role: string): WorkspaceLane {
  if (isExecutiveRole(role)) return "executive";
  if (isHRRole(role)) return "hr";
  if (["manager", "team_lead"].includes(role)) return "leadership";
  return "individual";
}
