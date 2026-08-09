// lib/departments.ts
// Default department seed list for ORBIT-I. Departments are also a
// real DB table (see supabase/migration-3-workspace-expansion.sql) so
// admins/HR can rename or add more from the Departments page — this
// list is only the initial seed + a fallback for display.
export const DEFAULT_DEPARTMENTS = [
  { name: "Executive", description: "Company leadership and strategy" },
  { name: "Engineering", description: "Full-stack, mobile, and platform development" },
  { name: "DevOps & QA", description: "Infrastructure, deployment, and quality assurance" },
  { name: "AI/ML", description: "AI integration, NLP, and machine learning work" },
  { name: "Design & Branding", description: "UI/UX, product design, and brand identity" },
  { name: "Human Resources", description: "Recruitment, onboarding, and team operations" },
  { name: "Business & Growth", description: "Client acquisition, partnerships, and strategy" },
] as const;
