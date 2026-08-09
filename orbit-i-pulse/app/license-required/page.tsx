// app/license-required/page.tsx
import { appConfig } from "@/config";
import { ShieldIcon } from "@/components/icons";

export default function LicenseRequiredPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "var(--gray-50, #f8fafc)",
      }}
    >
      <div className="card" style={{ maxWidth: 440, textAlign: "center", padding: "2.25rem 1.75rem" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
            color: "var(--color-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.1rem",
          }}
        >
          <ShieldIcon size={26} />
        </div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>License required</h1>
        <p className="text-sm text-muted" style={{ marginBottom: "1.25rem" }}>
          This copy of {appConfig.productName} doesn't have a valid license activated yet.
          Please contact your software provider to activate this deployment.
        </p>
        <a href={`mailto:${appConfig.adminEmail}`} className="btn btn-primary btn-sm">
          Contact support
        </a>
      </div>
    </main>
  );
}
