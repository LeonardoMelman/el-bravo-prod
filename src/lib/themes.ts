export type ThemeName = "leo" | "manu";

export const THEME_STORAGE_KEY = "elbravo-theme";
export const THEME_CHANGE_EVENT = "elbravo-themechange";

export type ThemeDefinition = {
  name: string;
  // Colors used for the inline preview (must not depend on CSS variables)
  preview: {
    bg: string;
    bgGradient: string | null;
    navbar: string;
    card: string;
    cardInner: string;
    surface: string;
    accentFrom: string;
    accentTo: string;
    text: string;
    textMuted: string;
    border: string;
  };
};

export const themes: Record<ThemeName, ThemeDefinition> = {
  leo: {
    name: "Leo Tema",
    preview: {
      bg: "#08142d",
      bgGradient: null,
      navbar: "#3b4f6c",
      card: "#1e293b",
      cardInner: "#0f172a",
      surface: "#334155",
      accentFrom: "#65a30d",
      accentTo: "#3f6212",
      text: "#ffffff",
      textMuted: "#94a3b8",
      border: "#334155",
    },
  },
  manu: {
    name: "Manu Tema",
    preview: {
      bg: "#181819",
      bgGradient: "linear-gradient(to bottom, #181819, #0A0A0A)",
      navbar: "#1a1a1a",
      card: "#262626",
      cardInner: "#1e1e1e",
      surface: "#2d2d2d",
      accentFrom: "#65a30d",
      accentTo: "#3f6212",
      text: "#ffffff",
      textMuted: "#a0a0a0",
      border: "#3a3a3a",
    },
  },
};

export function getStoredTheme(): ThemeName {
  if (typeof window === "undefined") return "leo";
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "manu" ? "manu" : "leo";
  } catch {
    return "leo";
  }
}

export function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}
