// config.ts
// =============================================================
// ORBIT-I PULSE — WHITE-LABEL CONFIGURATION
// =============================================================
export const appConfig = {
  productName: "ORBIT-I Pulse",
  creditLabel: "Powered by ORBIT-I",

  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || "ORBIT-I",
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
