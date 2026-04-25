"use client";

import { useEffect, useState } from "react";
import ThemePickerModal from "@/src/components/ThemePickerModal";
import {
  ThemeName,
  THEME_STORAGE_KEY,
  THEME_CHANGE_EVENT,
  applyTheme,
  getStoredTheme,
} from "@/src/lib/themes";

type Props = {
  /** "top" = shows when no theme selected; "bottom" = shows when theme is selected */
  position: "top" | "bottom";
};

export default function ThemeSelectorHome({ position }: Props) {
  const [hasTheme, setHasTheme] = useState<boolean | null>(null);
  const [currentTheme, setCurrentTheme] = useState<ThemeName>("leo");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function sync() {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      const has = saved === "leo" || saved === "manu";
      setHasTheme(has);
      if (has) setCurrentTheme(saved as ThemeName);
    }

    sync();

    // Auto-open on first load when no theme is set (top position only)
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (!saved && position === "top") {
      setIsOpen(true);
    }

    // Listen for theme changes dispatched by sibling instances
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, [position]);

  const handleSave = (theme: ThemeName) => {
    applyTheme(theme);
    setCurrentTheme(theme);
    setHasTheme(true);
    setIsOpen(false);
  };

  // While loading from localStorage, render nothing to avoid layout shift
  if (hasTheme === null) return null;

  // top position: only renders when no theme selected
  if (position === "top" && hasTheme) return null;

  // bottom position: only renders when theme is already selected
  if (position === "bottom" && !hasTheme) return null;

  return (
    <>
      <ThemePickerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={handleSave}
        initialTheme={currentTheme}
        canClose={!!hasTheme}
      />

      {position === "top" ? (
        <div className="mb-6 rounded-2xl border border-lime-500/25 bg-slate-800/60 p-5 text-center shadow-lg">
          <p className="text-lg font-semibold text-white">
            ¡Personalizá tu experiencia!
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Hay dos propuestas de paleta de colores. Elegí la que más te guste.
          </p>
          <button
            onClick={() => setIsOpen(true)}
            className="mt-4 rounded-xl bg-gradient-to-b from-lime-600 to-lime-800 px-6 py-2 font-semibold text-white transition hover:from-lime-500 hover:to-lime-700"
          >
            Elegí tu tema
          </button>
        </div>
      ) : (
        <div className="mt-6 flex justify-center pb-2">
          <button
            onClick={() => setIsOpen(true)}
            className="rounded-xl border border-slate-700 bg-slate-800/40 px-5 py-2 text-sm text-slate-400 transition hover:border-slate-600 hover:bg-slate-700/50 hover:text-white"
          >
            Cambiar tema de color
          </button>
        </div>
      )}
    </>
  );
}
