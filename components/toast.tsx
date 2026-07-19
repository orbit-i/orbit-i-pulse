// components/toast.tsx
// Minimal, dependency-free toast notifications. Replaces raw alert()
// calls and silent failures so every action gives clear feedback.
"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircleIcon, AlertIcon, XIcon } from "@/components/icons";

type Toast = { id: number; message: string; variant: "success" | "error" | "info" };
type ToastContextValue = { push: (message: string, variant?: Toast["variant"]) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((message: string, variant: Toast["variant"] = "info") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4500);
  }, []);

  function dismiss(id: number) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.variant === "success" ? "toast-success" : t.variant === "error" ? "toast-error" : ""}`}>
            {t.variant === "success" && <CheckCircleIcon size={16} />}
            {t.variant === "error" && <AlertIcon size={16} />}
            <span>{t.message}</span>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <XIcon size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
