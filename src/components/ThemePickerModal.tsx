"use client";

import { useState, useEffect } from "react";
import { ThemeName, ThemeDefinition, themes, THEME_STORAGE_KEY } from "@/src/lib/themes";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (theme: ThemeName) => void;
  initialTheme: ThemeName;
  canClose: boolean;
};

function ThemePreview({ def, selected }: { def: ThemeDefinition; selected: boolean }) {
  const p = def.preview;

  return (
    <div
      style={{
        background: p.bgGradient ?? p.bg,
        borderRadius: "10px",
        overflow: "hidden",
        height: "140px",
        padding: "0",
        border: selected ? "2px solid #84cc16" : "2px solid transparent",
        boxSizing: "border-box",
      }}
    >
      {/* Navbar bar */}
      <div
        style={{
          background: p.navbar,
          height: "22px",
          display: "flex",
          alignItems: "center",
          paddingLeft: "8px",
          gap: "6px",
        }}
      >
        <div style={{ width: "30px", height: "6px", background: p.text, borderRadius: "3px", opacity: 0.9 }} />
        <div style={{ marginLeft: "auto", marginRight: "8px", width: "18px", height: "18px", borderRadius: "50%", background: p.card }} />
      </div>

      {/* Page body */}
      <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
        {/* Outer card */}
        <div style={{ background: p.card, borderRadius: "6px", padding: "8px", display: "flex", flexDirection: "column", gap: "5px" }}>
          {/* Text lines */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "2px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: p.surface }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: "5px", background: p.text, borderRadius: "3px", width: "50%", marginBottom: "3px", opacity: 0.85 }} />
              <div style={{ height: "4px", background: p.textMuted, borderRadius: "3px", width: "35%", opacity: 0.6 }} />
            </div>
          </div>

          {/* CTA button */}
          <div
            style={{
              background: `linear-gradient(to bottom, ${p.accentFrom}, ${p.accentTo})`,
              height: "16px",
              borderRadius: "4px",
              width: "100%",
            }}
          />

          {/* Inner section */}
          <div style={{ background: p.cardInner, borderRadius: "4px", padding: "5px 6px", display: "flex", gap: "5px" }}>
            <div style={{ flex: 1, height: "5px", background: p.textMuted, borderRadius: "3px", opacity: 0.5 }} />
            <div style={{ flex: 1, height: "5px", background: p.textMuted, borderRadius: "3px", opacity: 0.3 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThemePickerModal({
  isOpen,
  onClose,
  onSave,
  initialTheme,
  canClose,
}: Props) {
  const [selected, setSelected] = useState<ThemeName>(initialTheme);

  // Sync selection when initialTheme changes (e.g. after external save)
  useEffect(() => {
    setSelected(initialTheme);
  }, [initialTheme]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div className="w-full max-w-xl rounded-2xl bg-slate-800 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Elegí tu tema</h2>
            <p className="mt-1 text-sm text-slate-400">
              Seleccioná cómo querés que se vea la app.
            </p>
          </div>
          {canClose && (
            <button
              onClick={onClose}
              className="ml-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-slate-300 transition hover:bg-slate-600 hover:text-white"
              aria-label="Cerrar"
            >
              ✕
            </button>
          )}
        </div>

        {/* Theme options */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(Object.entries(themes) as [ThemeName, ThemeDefinition][]).map(
            ([key, def]) => {
              const isSelected = selected === key;

              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={`rounded-xl border-2 p-3 text-left transition ${
                    isSelected
                      ? "border-lime-500 bg-lime-500/10"
                      : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/40"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-semibold text-white">{def.name}</span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-xs font-medium text-lime-400">
                        <span>✓</span> Activo
                      </span>
                    )}
                  </div>

                  <ThemePreview def={def} selected={isSelected} />

                  {/* Color swatches */}
                  <div className="mt-3 flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full border border-white/10"
                      style={{ background: def.preview.bgGradient ?? def.preview.bg }}
                      title="Fondo"
                    />
                    <div
                      className="h-4 w-4 rounded-full border border-white/10"
                      style={{ background: def.preview.navbar }}
                      title="Navbar"
                    />
                    <div
                      className="h-4 w-4 rounded-full border border-white/10"
                      style={{ background: def.preview.card }}
                      title="Tarjeta"
                    />
                    <div
                      className="h-4 w-4 rounded-full border border-white/10"
                      style={{ background: def.preview.accentFrom }}
                      title="Acento"
                    />
                    <span className="ml-1 text-xs text-slate-500">
                      {key === "leo"
                        ? "Azul marino · Azul grisáceo · Acento verde"
                        : "Negro · Gris neutro · Acento verde"}
                    </span>
                  </div>
                </button>
              );
            }
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => onSave(selected)}
            className="flex-1 rounded-xl bg-gradient-to-b from-lime-600 to-lime-800 py-3 font-semibold text-white transition hover:from-lime-500 hover:to-lime-700"
          >
            Guardar tema
          </button>
          {canClose && (
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-600 hover:text-white"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
