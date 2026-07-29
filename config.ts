// config.ts
// =============================================================
// ORBIT-I PULSE — WHITE-LABEL CONFIGURATION
// =============================================================
export const appConfig = {
  productName: "ORBIT-I Pulse",
  creditLabel: "Powered by ORBIT-I (Private) Limited",

  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || "ORBIT-I",
  // Full registered legal name, e.g. for footers, letterheads, and the login page.
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME || "ORBIT-I (Private) Limited",
  // Shown as a small trust badge on the login page and footer.
  registrationTag: process.env.NEXT_PUBLIC_REGISTRATION_TAG || "SECP-Registered Private Limited Company",
  // Updated to use the official ORBIT-I logo (.jpeg)
  logoUrl: "/orbit-i-logo.jpeg",
  faviconUrl: process.env.NEXT_PUBLIC_FAVICON_URL || "/favicon.ico",
  adminEmail: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@example.com",

  theme: {
    primary: process.env.NEXT_PUBLIC_PRIMARY_COLOR || "#0d7d6c",
    secondary: process.env.NEXT_PUBLIC_SECONDARY_COLOR || "#060B18",
  },
} as const;

export type AppConfig = typeof appConfig;
