"use client";
import { useEffect, useState } from "react";

export default function DarkModeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    setMounted(true);
    const html = document.documentElement;
    if (dark) {
      html.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      html.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  if (!mounted) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      className="rounded-md border border-black/10 dark:border-white/15 px-3 py-1 text-sm"
      aria-label="Toggle dark mode"
    >
      {dark ? "Light" : "Dark"}
    </button>
  );
}
