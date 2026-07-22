// app/login/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { appConfig } from "@/config";
import { OrbitScene } from "@/components/orbit-scene";
import { MailIcon, LockIcon, ArrowRightIcon, SparkIcon } from "@/components/icons";
import { useToast } from "@/components/toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      toast.push("Welcome back!", "success");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      {/* Left — brand stage */}
      <div className="auth-stage">
        <OrbitScene />
        <div className="auth-stage-content">
          <div className="brand-lockup">
            <div className="brand-tile" style={{ width: 42, height: 42 }}>
              <img src={appConfig.logoUrl} alt={appConfig.companyName} width={42} height={42} />
            </div>
            <span className="brand-name" style={{ fontSize: "1.05rem", color: "#fff" }}>
              {appConfig.companyName}
            </span>
          </div>
          <p className="auth-stage-headline">
            Track attendance.<br />
            Review daily work.<br />
            Ship faster.
          </p>
          <p className="auth-stage-sub">
            One platform for managers to monitor interns and team progress — real-time check-ins, daily reports, and performance stars.
          </p>
        </div>
        <div className="auth-stat-row">
          <div className="auth-stat"><b>100%</b><span>Attendance visibility</span></div>
          <div className="auth-stat"><b>Daily</b><span>Report reviews</span></div>
          <div className="auth-stat"><b>⭐ 5</b><span>Star performance ratings</span></div>
        </div>
      </div>

      {/* Right — form */}
      <div className="auth-form-side">
        <div className="auth-card fade-up">
          <div className="auth-card-icon-row">
            <div className="brand-tile" style={{ width: 38, height: 38 }}>
              <img src={appConfig.logoUrl} alt="" width={38} height={38} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.97rem" }}>Sign in to Pulse</div>
              <div className="text-muted text-xs">{appConfig.companyName} · Intern Management</div>
            </div>
          </div>

          {error && (
            <div className="form-error" role="alert">
              <SparkIcon size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="field-label" htmlFor="email">Email address</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", pointerEvents: "none", display: "flex" }}>
                  <MailIcon size={15} />
                </span>
                <input
                  id="email"
                  type="email"
                  className="input"
                  style={{ paddingLeft: "2.25rem" }}
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="password">Password</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", pointerEvents: "none", display: "flex" }}>
                  <LockIcon size={15} />
                </span>
                <input
                  id="password"
                  type="password"
                  className="input"
                  style={{ paddingLeft: "2.25rem" }}
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div style={{ textAlign: "right", marginTop: "0.4rem" }}>
                <Link href="/forgot-password" className="text-xs" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                  Forgot password?
                </Link>
              </div>
            </div>
            <div style={{ marginTop: "1.25rem" }}>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? "Signing in…" : <>Sign in <ArrowRightIcon size={15} /></>}
              </button>
            </div>
          </form>

          <hr className="divider mt-md" />
          <p className="text-sm text-muted" style={{ textAlign: "center" }}>
            No account yet?{" "}
            <Link href="/register" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
              Register here
            </Link>
          </p>
          <p className="text-xs text-muted mt-sm" style={{ textAlign: "center" }}>
            {appConfig.creditLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
