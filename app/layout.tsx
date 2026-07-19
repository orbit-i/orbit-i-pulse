// app/layout.tsx
import { appConfig } from "@/config";
import "./globals.css";
import { ToastProvider } from "@/components/toast";

export const metadata = {
  title: {
    default: `${appConfig.companyName} Pulse`,
    template: `%s · ${appConfig.companyName} Pulse`,
  },
  description: `${appConfig.companyName} — Intern & Team Management Platform`,
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: appConfig.theme.secondary,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={
          {
            "--color-primary": appConfig.theme.primary,
            "--color-secondary": appConfig.theme.secondary,
            "--font-space-grotesk": "'Space Grotesk'",
            "--font-inter": "'Inter'",
          } as React.CSSProperties
        }
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
