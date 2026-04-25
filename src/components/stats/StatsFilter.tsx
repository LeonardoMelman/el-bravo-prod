"use client";

export type FilterMode = "year" | "month" | "range";

export type FilterState = {
  mode: FilterMode;
  year: number;
  month: number; // 1–12
  rangeStart: string; // YYYY-MM-DD
  rangeEnd: string;
};

type Props = {
  filter: FilterState;
  onChange: (f: FilterState) => void;
};

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const now = new Date();
const YEARS = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

export default function StatsFilter({ filter, onChange }: Props) {
  const set = (partial: Partial<FilterState>) => onChange({ ...filter, ...partial });

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {/* Mode buttons */}
      <div className="t-border-accent flex overflow-hidden rounded-lg border">
        {(["year", "month", "range"] as FilterMode[]).map((m) => (
          <button
            key={m}
            onClick={() => set({ mode: m })}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter.mode === m
                ? "t-accent-surface text-white"
                : "t-dark-surface text-gray-400 hover:text-white"
            }`}
          >
            {m === "year" ? "año" : m === "month" ? "mes" : "rango"}
          </button>
        ))}
      </div>

      {/* Year selector (year + month modes) */}
      {(filter.mode === "year" || filter.mode === "month") && (
        <select
          value={filter.year}
          onChange={(e) => set({ year: parseInt(e.target.value) })}
          className="t-dark-surface t-border-accent cursor-pointer rounded-lg border px-3 py-1.5 text-xs text-white outline-none"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      )}

      {/* Month selector (month mode only) */}
      {filter.mode === "month" && (
        <select
          value={filter.month}
          onChange={(e) => set({ month: parseInt(e.target.value) })}
          className="t-dark-surface t-border-accent cursor-pointer rounded-lg border px-3 py-1.5 text-xs text-white outline-none"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={i + 1} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
      )}

      {/* Date range (range mode) */}
      {filter.mode === "range" && (
        <>
          <input
            type="date"
            value={filter.rangeStart}
            onChange={(e) => set({ rangeStart: e.target.value })}
            className="t-dark-surface t-border-accent rounded-lg border px-3 py-1.5 text-xs text-white outline-none"
          />
          <span className="text-gray-500 text-xs">—</span>
          <input
            type="date"
            value={filter.rangeEnd}
            min={filter.rangeStart}
            onChange={(e) => set({ rangeEnd: e.target.value })}
            className="t-dark-surface t-border-accent rounded-lg border px-3 py-1.5 text-xs text-white outline-none"
          />
        </>
      )}
    </div>
  );
}
