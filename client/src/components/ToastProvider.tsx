"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = {
  id: string;
  type?: "success" | "error" | "info";
  title: string;
  description?: string;
  timeoutMs?: number;
};

type ToastContextValue = {
  notify: (t: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { timeoutMs: 3500, ...t, id };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, toast.timeoutMs);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-0 top-3 z-[1000] flex flex-col items-center gap-2 px-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              "w-full max-w-md rounded-md border px-4 py-3 shadow backdrop-blur " +
              (t.type === "error"
                ? "border-red-400 bg-red-100/60 text-red-900 dark:bg-red-900/30 dark:text-red-100"
                : t.type === "success"
                ? "border-green-400 bg-green-100/60 text-green-900 dark:bg-green-900/30 dark:text-green-100"
                : "border-black/10 bg-background/70 text-foreground dark:border-white/15")
            }
          >
            <div className="font-medium">{t.title}</div>
            {t.description ? (
              <div className="text-sm opacity-80">{t.description}</div>
            ) : null}
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
