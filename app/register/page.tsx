// app/register/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { appConfig } from "@/config";
import { OrbitScene } from "@/components/orbit-scene";
import { MailIcon, LockIcon, UserIcon, ArrowRightIcon, SparkIcon, ShieldIcon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { REG_NUMBER_EXAMPLE, REG_NUMBER_HELP } from "@/lib/reg-number";

const SECURITY_QUESTIONS = [
  "What was the name of your first school?",
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your favorite teacher's name?",
];

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!fullName.trim() || !email.trim() || !password || !registrationNumber.trim() || !securityAnswer.trim()) {
      setError("All fields are required");
      return;
    }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          registrationNumber: registrationNumber.trim(),
          securityQuestion,
          securityAnswer: securityAnswer.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed."); return; }
      toast.push("Account created! Welcome aboard.", "success");
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
            Join the team.<br />
            Check in daily.<br />
            Grow together.
          </p>
          <p className="auth-stage-sub">
            Create your account and start submitting daily reports, tracking attendance, and getting performance ratings from your manager.
          </p>
        </div>
        <div className="auth-stat-row">
          <div className="auth-stat"><b>Daily</b><span>Check-in &amp; check-out</span></div>
          <div className="auth-stat"><b>⭐ Stars</b><span>Performance ratings</span></div>
          <div className="auth-stat"><b>CSV</b><span>Exportable reports</span></div>
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
              <div style={{ fontWeight: 700, fontSize: "0.97rem" }}>Create your account</div>
              <div className="text-muted text-xs">{appConfig.companyName} · Intern Management</div>
            </div>
          </div>

          {error && (
            <div className="form-error" role="alert">
              <SparkIcon size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label className="field-label" htmlFor="fullName">Full name</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", pointerEvents: "none", display: "flex" }}>
                  <UserIcon size={15} />
                </span>
                <input
                  id="fullName"
                  type="text"
                  className="input"
                  style={{ paddingLeft: "2.25rem" }}
                  placeholder="Your full name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>
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
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="regNumber">Registration number</label>
              <input
                id="regNumber"
                type="text"
                className="input"
                placeholder={REG_NUMBER_EXAMPLE}
                value={registrationNumber}
                onChange={e => setRegistrationNumber(e.target.value)}
              />
              <p className="text-xs text-muted" style={{ marginTop: "0.35rem" }}>{REG_NUMBER_HELP}</p>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="password">Password <span className="text-muted">(min 8 chars)</span></label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", pointerEvents: "none", display: "flex" }}>
                  <LockIcon size={15} />
                </span>
                <input
                  id="password"
                  type="password"
                  className="input"
                  style={{ paddingLeft: "2.25rem" }}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
            </div>

            <hr className="divider mt-sm" style={{ marginBottom: "1rem" }} />
            <p className="text-xs text-muted" style={{ marginTop: "-0.4rem", marginBottom: "0.85rem" }}>
              Used later to reset your password without email.
            </p>

            <div className="field">
              <label className="field-label" htmlFor="securityQuestion">Security question</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", pointerEvents: "none", display: "flex" }}>
                  <ShieldIcon size={15} />
                </span>
                <select
                  id="securityQuestion"
                  className="select"
                  style={{ paddingLeft: "2.25rem" }}
                  value={securityQuestion}
                  onChange={e => setSecurityQuestion(e.target.value)}
                >
                  {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="securityAnswer">Your answer</label>
              <input
                id="securityAnswer"
                type="text"
                className="input"
                placeholder="Answer (remember this!)"
                value={securityAnswer}
                onChange={e => setSecurityAnswer(e.target.value)}
              />
            </div>

            <div style={{ marginTop: "1.25rem" }}>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? "Creating account…" : <>Create account <ArrowRightIcon size={15} /></>}
              </button>
            </div>
          </form>

          <hr className="divider mt-md" />
          <p className="text-sm text-muted" style={{ textAlign: "center" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
              Sign in
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
