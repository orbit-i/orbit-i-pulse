// components/theme-toggle.tsx
"use client";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@/components/icons";

export function ThemeToggle({ dark = false }: { dark?: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = (localStorage.getItem("orbit-theme") as "light" | "dark" | null) || "light";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("orbit-theme", next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      style={{
        width: 34, height: 34, borderRadius: "50%", border: "none",
        background: dark ? "rgba(255,255,255,0.08)" : "var(--gray-100, #f1f5f9)",
        color: dark ? "#fff" : "var(--gray-600, #475569)",
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
      }}
    >
      {theme === "light" ? <MoonIcon size={16} /> : <SunIcon size={16} />}
    </button>
  );
}
