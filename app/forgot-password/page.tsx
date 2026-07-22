// app/forgot-password/page.tsx
// Self-serve password reset — no email provider required. Three steps:
// 1) email -> fetch security question
// 2) answer the question -> get a short-lived reset token
// 3) set a new password using that token
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { appConfig } from "@/config";
import { OrbitScene } from "@/components/orbit-scene";
import { MailIcon, LockIcon, ArrowRightIcon, SparkIcon, ShieldIcon } from "@/components/icons";
import { useToast } from "@/components/toast";

type Step = "lookup" | "answer" | "reset" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("lookup");
  const [email, setEmail] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const toast = useToast();

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Lookup failed."); return; }
      setSecurityQuestion(data.securityQuestion);
      setStep("answer");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswer(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          securityAnswer: securityAnswer.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "That answer didn't match."); return; }
      setResetToken(data.resetToken);
      setStep("reset");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Reset failed."); return; }
      toast.push("Password reset! Please sign in.", "success");
      setStep("done");
      setTimeout(() => router.push("/login"), 1500);
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
            Forgot your<br />
            password?<br />
            No problem.
          </p>
          <p className="auth-stage-sub">
            Verify your email and security answer to set a new password — no email inbox needed.
          </p>
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
              <div style={{ fontWeight: 700, fontSize: "0.97rem" }}>Reset your password</div>
              <div className="text-muted text-xs">{appConfig.companyName} · Intern Management</div>
            </div>
          </div>

          {error && (
            <div className="form-error" role="alert">
              <SparkIcon size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          {step === "lookup" && (
            <form onSubmit={handleLookup}>
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
              <div style={{ marginTop: "1.25rem" }}>
                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                  {loading ? "Checking…" : <>Continue <ArrowRightIcon size={15} /></>}
                </button>
              </div>
            </form>
          )}

          {step === "answer" && (
            <form onSubmit={handleAnswer}>
              <div className="field">
                <label className="field-label" htmlFor="question">Security question</label>
                <p className="text-sm" style={{ marginTop: "-0.2rem", marginBottom: "0.75rem", color: "var(--gray-700)" }}>
                  {securityQuestion}
                </p>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", pointerEvents: "none", display: "flex" }}>
                    <ShieldIcon size={15} />
                  </span>
                  <input
                    id="answer"
                    type="text"
                    className="input"
                    style={{ paddingLeft: "2.25rem" }}
                    placeholder="Your answer"
                    value={securityAnswer}
                    onChange={e => setSecurityAnswer(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.65rem" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setStep("lookup")}>Back</button>
                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                  {loading ? "Verifying…" : <>Verify <ArrowRightIcon size={15} /></>}
                </button>
              </div>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleReset}>
              <div className="field">
                <label className="field-label" htmlFor="newPassword">New password <span className="text-muted">(min 8 chars)</span></label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", pointerEvents: "none", display: "flex" }}>
                    <LockIcon size={15} />
                  </span>
                  <input
                    id="newPassword"
                    type="password"
                    className="input"
                    style={{ paddingLeft: "2.25rem" }}
                    placeholder="Create a new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="confirmPassword">Confirm password</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", pointerEvents: "none", display: "flex" }}>
                    <LockIcon size={15} />
                  </span>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="input"
                    style={{ paddingLeft: "2.25rem" }}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div style={{ marginTop: "1.25rem" }}>
                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                  {loading ? "Saving…" : "Set new password"}
                </button>
              </div>
            </form>
          )}

          {step === "done" && (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <p className="text-sm" style={{ color: "var(--gray-700)" }}>
                Password updated! Redirecting you to sign in…
              </p>
            </div>
          )}

          <hr className="divider mt-md" />
          <p className="text-sm text-muted" style={{ textAlign: "center" }}>
            Remembered it?{" "}
            <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
              Back to sign in
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
