"use client";

import { useState, useEffect, useCallback } from "react";
import StatsFilter from "@/src/components/stats/StatsFilter";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  "Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic",
];

const GROUP_LABEL = {
  legs: "piernas", chest: "pecho", back: "espalda",
  shoulders: "hombros", arms: "brazos", core: "core",
  glutes: "glúteos", full_body: "cuerpo completo",
};
const GROUP_COLOR = {
  legs: "#a78bfa", chest: "#60a5fa", back: "#34d399",
  shoulders: "#fbbf24", arms: "#f87171", core: "#fb923c",
  glutes: "#e879f9", full_body: "#6366f1",
};
const SLOT_COLORS = {
  manana: "#84cc16", tarde: "#8AC617", noche: "#3b82f6", madrugada: "#6366f1",
};

function fmtWeekLabel(weekStart) {
  const d = new Date(weekStart + "T12:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function fmtNum(n) {
  return Math.round(n).toLocaleString("es-AR");
}

// ─── Chart & UI Primitives ────────────────────────────────────────────────────

/**
 * Vertical CSS bar chart.
 * data: [{ label, value }]
 */
function BarChart({ data, barColor }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const color = barColor ?? "linear-gradient(to bottom, #a0d420, #6b8a12)";

  return (
    <div>
      <div className="flex items-stretch gap-[2px] h-24 overflow-visible">
        {data.map((d, i) => {
          const pct = (d.value / maxVal) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end h-full">
              <div
                className="relative w-full"
                style={{
                  height: `${pct}%`,
                  minHeight: d.value > 0 ? "2px" : "0",
                }}
              >
                <span
                  className="absolute left-0 right-0 text-center leading-none text-white whitespace-nowrap"
                  style={{ fontSize: "7px", top: "-13px" }}
                >
                  {d.value > 0 ? fmtNum(d.value) : "0"}
                </span>
                {d.value > 0 && (
                  <div
                    className="w-full h-full rounded-t"
                    style={{ background: color }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-[2px] mt-1">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 text-center truncate text-gray-400"
            style={{ fontSize: "7px" }}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SVG line chart for week-mode charts.
 * data: [{ label, value }]
 */
function LineChart({ data }) {
  if (!data || data.length < 2) {
    return (
      <p className="text-xs text-gray-500 text-center py-8">
        Sin semanas completas para mostrar
      </p>
    );
  }
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const n = data.length;
  const vbW = Math.max(n * 16, 80);
  const vbH = 88;
  const chartH = 60;
  const topPad = 14;

  const pts = data.map((d, i) => ({
    x: n > 1 ? (i / (n - 1)) * (vbW - 8) + 4 : vbW / 2,
    y: topPad + (1 - d.value / maxVal) * chartH,
    value: d.value,
    label: d.label,
  }));

  const pathD = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaD = `${pathD} L${pts[n - 1].x.toFixed(1)},${topPad + chartH} L${pts[0].x.toFixed(1)},${topPad + chartH} Z`;
  const showEvery = n > 20 ? 4 : n > 12 ? 2 : 1;

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      width="100%"
      style={{ height: "110px" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="lgFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8AC617" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#8AC617" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#lgFill)" />
      <path
        d={pathD}
        fill="none"
        stroke="#8AC617"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="2" fill="#8AC617" />
          {p.value > 0 && (
            <text
              x={p.x}
              y={Math.max(p.y - 3, 8)}
              textAnchor="middle"
              fill="white"
              fontSize="4"
            >
              {fmtNum(p.value)}
            </text>
          )}
          {i % showEvery === 0 && (
            <text
              x={p.x}
              y={vbH - 1}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="3.8"
            >
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Single horizontal bar row */
function HBar({ label, value, maxValue, color }) {
  const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white">{label}</span>
        <span className="text-sm text-gray-400 tabular-nums ml-3">{fmtNum(value)}</span>
      </div>
      <div className="h-2 rounded" style={{ background: "#1a2840" }}>
        <div
          className="h-full rounded transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

/** Section wrapper card */
function SCard({ title, subtitle, children }) {
  return (
    <div className="t-dark-surface rounded-xl p-4">
      {(title || subtitle) && (
        <div className="mb-3">
          {title && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {title}
            </p>
          )}
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

/** Large KPI card (entrenamientos, minutos) */
function KpiCard({ value, label, curr, prev }) {
  let changeEl = null;
  if (typeof curr === "number" && typeof prev === "number" && prev > 0) {
    const pct = Math.round(((curr - prev) / prev) * 100);
    const pos = pct >= 0;
    changeEl = (
      <span
        className={`text-xs font-semibold ${pos ? "text-[#8AC617]" : "text-red-400"}`}
      >
        {pos ? "+" : ""}
        {pct}%
      </span>
    );
  }
  return (
    <div className="t-dark-surface rounded-xl p-4">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-3xl font-bold text-white leading-none">{value}</span>
        {changeEl}
      </div>
      <p className="text-m text-gray-400 mt-1.5">{label}</p>
    </div>
  );
}

/** Small KPI (por semana, minutos/ent, descanso) */
function SmKpi({ value, label }) {
  return (
    <div className="t-dark-surface rounded-xl p-3">
      <div className="text-xl sm:text-2xl font-bold text-white leading-none">{value}</div>
      <p className="text-[10px] sm:text-xs text-gray-400 mt-1 leading-tight">{label}</p>
    </div>
  );
}

/** Week streak card */
function WeekCard({ value, label, highlight }) {
  return (
    <div
      className={`rounded-xl p-4 ${
        highlight ? "bg-[#2d6a04]" : "t-dark-surface"
      }`}
    >
      <div className="text-3xl font-bold text-white">{value}</div>
      <p className="text-xs text-gray-300 mt-1 leading-tight">{label}</p>
    </div>
  );
}

// ─── Date range helper ────────────────────────────────────────────────────────

function getDateRange(filter) {
  const pad = (n) => String(n).padStart(2, "0");

  if (filter.mode === "year") {
    const y = filter.year;
    return {
      startDate: `${y}-01-01`,
      endDate: `${y}-12-31`,
      prevStartDate: `${y - 1}-01-01`,
      prevEndDate: `${y - 1}-12-31`,
    };
  }

  if (filter.mode === "month") {
    const { year: y, month: m } = filter;
    const lastDay = new Date(y, m, 0).getDate();
    const pLastDay = new Date(y - 1, m, 0).getDate();
    return {
      startDate: `${y}-${pad(m)}-01`,
      endDate: `${y}-${pad(m)}-${pad(lastDay)}`,
      prevStartDate: `${y - 1}-${pad(m)}-01`,
      prevEndDate: `${y - 1}-${pad(m)}-${pad(pLastDay)}`,
    };
  }

  // range
  const { rangeStart, rangeEnd } = filter;
  if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) return null;
  const s = new Date(rangeStart + "T12:00:00");
  const e = new Date(rangeEnd + "T12:00:00");
  const days = Math.round((e - s) / (1000 * 60 * 60 * 24));
  const ps = new Date(s);
  ps.setDate(ps.getDate() - days - 1);
  const pe = new Date(s);
  pe.setDate(pe.getDate() - 1);
  return {
    startDate: rangeStart,
    endDate: rangeEnd,
    prevStartDate: ps.toISOString().slice(0, 10),
    prevEndDate: pe.toISOString().slice(0, 10),
  };
}

// ─── Stats content sections ───────────────────────────────────────────────────

function TopKpis({ data }) {
  const { totalTrainings, totalMinutes, trainingsPerWeek, minutesPerTraining, avgRestDays } = data;
  return (
    <div className="space-y-3">
      {/* Row 1: 2 large cards */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          value={fmtNum(totalTrainings)}
          label="entrenamientos"
          curr={totalTrainings}
          prev={data.prevTotalTrainings}
        />
        <KpiCard
          value={fmtNum(totalMinutes)}
          label="minutos"
          curr={totalMinutes}
          prev={data.prevTotalMinutes}
        />
      </div>
      {/* Row 2: 3 small cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <SmKpi
          value={trainingsPerWeek !== null ? trainingsPerWeek : "-"}
          label="entrenamientos por semana"
        />
        <SmKpi value={minutesPerTraining} label="minutos por entrenamiento" />
        <SmKpi
          value={avgRestDays !== null ? avgRestDays : "-"}
          label="dias de descanso promedio"
        />
      </div>
    </div>
  );
}

function TrainingsChart({ data }) {
  const { mode, trainingsByMonth, trainingsByWeek, hasCompleteWeeks } = data;

  if (mode === "year") {
    const chartData = trainingsByMonth.map((d) => ({
      label: MONTH_LABELS[d.month - 1],
      value: d.count,
    }));
    return (
      <SCard title="entrenamientos">
        <BarChart data={chartData} />
      </SCard>
    );
  }

  if (!hasCompleteWeeks) return null;

  const chartData = trainingsByWeek.map((d) => ({
    label: fmtWeekLabel(d.weekStart),
    value: d.count,
  }));
  return (
    <SCard title="entrenamientos">
      <LineChart data={chartData} />
    </SCard>
  );
}

function MinutesChart({ data }) {
  const { mode, minutesByMonth, minutesByWeek, hasCompleteWeeks } = data;

  if (mode === "year") {
    const chartData = minutesByMonth.map((d) => ({
      label: MONTH_LABELS[d.month - 1],
      value: d.minutes,
    }));
    return (
      <SCard title="minutos de entrenamiento">
        <BarChart data={chartData} />
      </SCard>
    );
  }

  if (!hasCompleteWeeks) return null;

  const chartData = minutesByWeek.map((d) => ({
    label: fmtWeekLabel(d.weekStart),
    value: d.minutes,
  }));
  return (
    <SCard title="minutos de entrenamiento">
      <LineChart data={chartData} />
    </SCard>
  );
}

function WeekStatsRow({ weekStats }) {
  const { activeWeeks, longestActiveStreak, perfectWeeks, longestPerfectStreak } = weekStats;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      <WeekCard value={activeWeeks} label="semanas activas" />
      <WeekCard value={longestActiveStreak} label="racha mas larga" />
      <WeekCard value={perfectWeeks} label="semanas perfectas" highlight />
      <WeekCard value={longestPerfectStreak} label="racha mas larga" highlight />
    </div>
  );
}

function TrainingDotsSection({ dotStats }) {
  const { expected, done, completeWeeks } = dotStats;
  if (completeWeeks === 0) return null;

  const greens = Math.min(done, expected);
  const greys = Math.max(0, expected - done);
  const yellows = Math.max(0, done - expected);

  const dots = [
    ...Array(greens).fill("green"),
    ...Array(greys).fill("grey"),
    ...Array(yellows).fill("yellow"),
  ];

  // Safety cap to avoid rendering thousands of dots
  const displayDots = dots.slice(0, 600);

  return (
    <div className="t-dark-surface rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          entrenamientos
        </p>
        <span className="text-xs text-gray-400 tabular-nums">
          {done}/{Math.max(expected, done)}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {displayDots.map((type, i) => (
          <div
            key={i}
            className="rounded-full flex-shrink-0"
            style={
              type === "green"
                ? { width: 14, height: 14, background: "linear-gradient(to bottom, #a0d420, #6b8a12)" }
                : type === "yellow"
                ? { width: 14, height: 14, background: "#facc15" }
                : { width: 10, height: 10, background: "#1e3050", border: "1px solid #2d4060" }
            }
          />
        ))}
      </div>
      {dots.length > 600 && (
        <p className="text-xs text-gray-500 mt-2">... y {dots.length - 600} más</p>
      )}
    </div>
  );
}

function MuscleGroupSection({ muscleGroupMinutes }) {
  if (!muscleGroupMinutes || muscleGroupMinutes.length === 0) return null;
  const maxVal = Math.max(...muscleGroupMinutes.map((g) => g.minutes), 1);
  return (
    <SCard title="minutos por grupo muscular">
      <div className="space-y-3">
        {muscleGroupMinutes.map((g) => (
          <HBar
            key={g.groupKey}
            label={GROUP_LABEL[g.groupKey] ?? g.groupKey}
            value={g.minutes}
            maxValue={maxVal}
            color={GROUP_COLOR[g.groupKey] ?? "#6b7280"}
          />
        ))}
      </div>
    </SCard>
  );
}

function TopMusclesSection({ topMuscles, topMuscleName, topMuscleAppearances }) {
  if (!topMuscles || topMuscles.length === 0) return null;
  const maxVal = Math.max(...topMuscles.map((m) => m.minutes), 1);

  return (
    <SCard
      title="minutos por musculo"
      subtitle={
        topMuscleName
          ? `Tu músculo más entrenado es ${topMuscleName}, apareciendo en ${topMuscleAppearances} de tus entrenamientos`
          : undefined
      }
    >
      <div className="space-y-3">
        {topMuscles.map((m) => (
          <HBar
            key={m.muscleId}
            label={m.muscleName}
            value={m.minutes}
            maxValue={maxVal}
            color={GROUP_COLOR[m.groupKey] ?? "#6b7280"}
          />
        ))}
      </div>
    </SCard>
  );
}

function WeekdayChart({ minutesByWeekday }) {
  const sorted = [...minutesByWeekday].sort((a, b) => a.day - b.day);
  const chartData = sorted.map((d) => ({ label: d.dayName, value: d.minutes }));
  return (
    <SCard title="minutos por dia de la semana">
      <BarChart data={chartData} />
    </SCard>
  );
}

function TimeSlotChart({ minutesByTimeSlot }) {
  const maxVal = Math.max(...minutesByTimeSlot.map((s) => s.minutes), 1);
  return (
    <SCard title="minutos por horario">
      <div className="space-y-3">
        {minutesByTimeSlot.map((s) => (
          <HBar
            key={s.slot}
            label={s.label}
            value={s.minutes}
            maxValue={maxVal}
            color={SLOT_COLORS[s.slot] ?? "#6b7280"}
          />
        ))}
      </div>
    </SCard>
  );
}

function StatsContent({ data }) {
  const hasMuscleData =
    data.muscleGroupMinutes && data.muscleGroupMinutes.length > 0;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <TopKpis data={data} />

      {/* Trainings chart */}
      <TrainingsChart data={data} />

      {/* Minutes chart */}
      <MinutesChart data={data} />

      {/* Week stats */}
      {data.weekStats && <WeekStatsRow weekStats={data.weekStats} />}

      {/* Training dots */}
      {data.weekStats && <TrainingDotsSection dotStats={data.dotStats} />}

      {/* Muscle sections */}
      {hasMuscleData && (
        <MuscleGroupSection muscleGroupMinutes={data.muscleGroupMinutes} />
      )}
      {data.topMuscles && data.topMuscles.length > 0 && (
        <TopMusclesSection
          topMuscles={data.topMuscles}
          topMuscleName={data.topMuscleName}
          topMuscleAppearances={data.topMuscleAppearances}
        />
      )}

      {/* Time distribution: side-by-side on md+, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WeekdayChart minutesByWeekday={data.minutesByWeekday} />
        <TimeSlotChart minutesByTimeSlot={data.minutesByTimeSlot} />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const now = new Date();
  const [filter, setFilter] = useState({
    mode: "year",
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    rangeStart: "",
    rangeEnd: "",
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (f) => {
    const range = getDateRange(f);
    if (!range) return; // invalid range (e.g. empty range dates)

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ startDate: range.startDate, endDate: range.endDate, mode: f.mode });
    if (range.prevStartDate) {
      params.set("prevStartDate", range.prevStartDate);
      params.set("prevEndDate", range.prevEndDate);
    }

    try {
      const res = await fetch(`/api/stats?${params}`);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error("Error al cargar estadísticas");
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(filter);
  }, [filter, fetchData]);

  const userName = data?.user?.name ?? "";
  const userPhoto = data?.user?.photoUrl ?? null;

  return (
    <main className="t-page-bg min-h-screen text-white">
      <div className="mx-auto max-w-2xl px-4 py-5 pb-10">
        {/* ── Header ── */}
        <div className="flex items-start sm:items-center justify-between mb-5 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <a
              href="/home"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1a2840] text-gray-400 hover:text-white transition text-sm shrink-0"
              aria-label="Volver"
            >
              ←
            </a>
            <h1 className="text-xl font-bold tracking-tight">Estadísticas</h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end flex-1">

            <StatsFilter filter={filter} onChange={setFilter} />
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-[#8AC617] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-400">Cargando estadísticas...</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className="rounded-xl bg-red-900/30 border border-red-800/60 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* ── Stats ── */}
        {!loading && !error && data && <StatsContent data={data} />}

        {/* ── Empty (no trainings but no error) ── */}
        {!loading && !error && data && data.totalTrainings === 0 && (
          <div className="t-dark-surface mt-4 rounded-xl p-6 text-center">
            <p className="text-gray-400 text-sm">
              No hay entrenamientos registrados en este período.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
