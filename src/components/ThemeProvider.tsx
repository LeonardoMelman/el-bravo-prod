"use client";

import { useEffect } from "react";
import { THEME_STORAGE_KEY } from "@/src/lib/themes";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Re-apply theme after hydration (inline script in <head> handles the initial apply)
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      const theme = saved === "manu" ? "manu" : "leo";
      document.documentElement.setAttribute("data-theme", theme);
    } catch {
      document.documentElement.setAttribute("data-theme", "leo");
    }
  }, []);

  return <>{children}</>;
}
