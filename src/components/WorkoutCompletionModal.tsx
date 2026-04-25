"use client";

import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type InitialPoint = { seasonId: string; points: number };

type WeekProgress = {
  activitiesCount: number;
  goalTarget: number;
  goalReached: boolean;
  perfectWeek: boolean;
  streakCount: number;
};

type SeasonContribution = {
  seasonId: string;
  seasonName: string;
  groupName: string;
  pointsEarned: number;
  basePoints: number;
  bonusPoints: number;
  consistencyMultiplier: number | null;
  comebackBonus: number | null;
  weekProgress: WeekProgress | null;
};

type NonQualifyingSeason = {
  seasonId: string;
  seasonName: string;
  groupName: string;
  reasonLabel: string;
};

type AwardProgress = {
  id: string;
  name: string;
  description: string;
  iconKey: string | null;
  progressCurrent: number;
  progressTarget: number;
  progressPct: number;
  earned: boolean;
  justEarned: boolean;
  pointsBonus: number;
};

type SummaryData = {
  activity: { id: string; durationMinutes: number; categoryName: string };
  totalPoints: number;
  seasonContributions: SeasonContribution[];
  nonQualifyingSeasons: NonQualifyingSeason[];
  awardsProgress: AwardProgress[];
};

type Props = {
  activityId: string;
  initialPoints: InitialPoint[];
  onClose: () => void;
};

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, durationMs: number, active: boolean): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || target === 0) {
      setValue(target);
      return;
    }
    startRef.current = null;

    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const pct = Math.min((ts - startRef.current) / durationMs, 1);
      const eased = 1 - Math.pow(1 - pct, 3); // ease-out cubic
      setValue(Math.round(eased * target));
      if (pct < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, active]);

  return value;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-slate-700/50 ${className}`} />
  );
}

function AnimatedBar({
  pct,
  color,
  delayMs = 0,
}: {
  pct: number;
  color: "lime" | "amber" | "slate";
  delayMs?: number;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(pct, 100)), delayMs + 80);
    return () => clearTimeout(t);
  }, [pct, delayMs]);

  const gradient =
    color === "lime"
      ? "from-lime-500 to-lime-400"
      : color === "amber"
      ? "from-amber-500 to-amber-400"
      : "from-slate-500 to-slate-600";

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/60">
      <div
        className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-[900ms] ease-out ${gradient}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

// Segmented dot row: filled = done, outlined = remaining
function WeekDots({ count, goal, perfect }: { count: number; goal: number; perfect: boolean }) {
  const dots = Math.max(goal, count); // show at least goal dots
  const color = perfect ? "bg-amber-400" : "bg-lime-400";
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: dots }, (_, i) => {
        const filled = i < count;
        return (
          <div
            key={i}
            className={`h-3 w-3 rounded-full border-2 transition-all duration-300 ${
              filled
                ? `${color} border-transparent`
                : perfect
                ? "border-amber-500/40"
                : "border-lime-500/30"
            }`}
            style={{ transitionDelay: `${i * 80}ms` }}
          />
        );
      })}
    </div>
  );
}

function SeasonCard({
  season,
  index,
}: {
  season: SeasonContribution;
  index: number;
}) {
  const wp = season.weekProgress;
  const remaining = wp ? Math.max(0, wp.goalTarget - wp.activitiesCount) : 0;

  const borderClass = wp?.perfectWeek
    ? "border-amber-500/40 bg-amber-500/5"
    : wp?.goalReached
    ? "border-lime-500/30 bg-lime-500/5"
    : "border-slate-700 bg-slate-900";

  return (
    <div
      className={`rounded-xl border p-4 ${borderClass}`}
      style={{ animation: `slideUp 0.4s ease-out ${index * 80}ms both` }}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-white">{season.seasonName}</div>
          <div className="text-xs text-slate-400">{season.groupName}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-black text-lime-400">
            +{season.pointsEarned}
          </div>
          <div className="text-xs text-slate-500">pts</div>
        </div>
      </div>

      {/* Weekly goal progress */}
      {wp ? (
        <div className="space-y-2">
          {/* Segmented dots */}
          <WeekDots count={wp.activitiesCount} goal={wp.goalTarget} perfect={wp.perfectWeek} />

          {/* Labels */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {wp.activitiesCount} / {wp.goalTarget} esta semana
              {!wp.goalReached && remaining > 0 && (
                <span className="text-slate-500"> · faltan {remaining}</span>
              )}
            </span>
            {wp.perfectWeek ? (
              <span className="font-semibold text-amber-400">Semana perfecta 🔥</span>
            ) : wp.goalReached ? (
              <span className="font-semibold text-lime-400">Meta cumplida ✓</span>
            ) : null}
          </div>

          {/* Streak */}
          {wp.streakCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span className="text-amber-400">🔥</span>
              <span>
                Racha de{" "}
                <span className="font-semibold text-amber-400">
                  {wp.streakCount}{" "}
                  {wp.streakCount === 1 ? "semana" : "semanas"}
                </span>
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-2/5" />
          <div className="flex gap-1.5">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-3 w-3 rounded-full" />
            ))}
          </div>
        </div>
      )}

      {/* Multiplier / comeback badges */}
      {((season.consistencyMultiplier ?? 1) > 1 ||
        (season.comebackBonus ?? 0) > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(season.consistencyMultiplier ?? 1) > 1 && (
            <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-400">
              ×{season.consistencyMultiplier} consistencia
            </span>
          )}
          {(season.comebackBonus ?? 0) > 0 && (
            <span className="rounded-full bg-purple-500/15 px-2.5 py-0.5 text-xs font-medium text-purple-400">
              +{season.comebackBonus} regreso
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function AwardCard({
  award,
  index,
}: {
  award: AwardProgress;
  index: number;
}) {
  const animation = award.justEarned
    ? `scaleIn 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 100}ms both`
    : `slideUp 0.4s ease-out ${index * 80}ms both`;

  const borderClass = award.justEarned
    ? "border-amber-400/50 bg-amber-400/8"
    : award.earned
    ? "border-lime-500/30 bg-lime-500/5"
    : "border-slate-700 bg-slate-900";

  const icon = award.justEarned ? "🏆" : award.earned ? "✅" : "🎖️";

  const iconBg = award.justEarned
    ? "bg-amber-400/20"
    : award.earned
    ? "bg-lime-400/15"
    : "bg-slate-700/60";

  return (
    <div
      className={`rounded-xl border p-4 ${borderClass}`}
      style={{ animation }}
    >
      <div className="mb-3 flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${iconBg}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-semibold ${award.justEarned ? "text-amber-400" : "text-white"}`}
            >
              {award.name}
            </span>
            {award.justEarned && (
              <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-300">
                ¡Nuevo!
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-slate-400 line-clamp-2">
            {award.description}
          </div>
        </div>
      </div>

      {!award.earned && (
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
            <span>
              {award.progressCurrent} / {award.progressTarget}
            </span>
            <span>{award.progressPct}%</span>
          </div>
          <AnimatedBar
            pct={award.progressPct}
            color={award.progressPct >= 75 ? "lime" : "amber"}
            delayMs={index * 80}
          />
        </div>
      )}
    </div>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  "#a3e635", "#facc15", "#60a5fa",
  "#f472b6", "#34d399", "#fb923c",
];

function Confetti() {
  const dots = CONFETTI_COLORS.flatMap((color, ci) =>
    Array.from({ length: 4 }, (_, i) => {
      const key = ci * 4 + i;
      return (
        <div
          key={key}
          className="absolute h-2 w-2 rounded-full"
          style={{
            backgroundColor: color,
            left: `${4 + (key / 23) * 92}%`,
            top: "-6px",
            animation: `confettiFall 1.8s ease-in ${key * 75}ms both`,
          }}
        />
      );
    })
  );
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-36 overflow-hidden">
      {dots}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WorkoutCompletionModal({
  activityId,
  initialPoints,
  onClose,
}: Props) {
  // 0 = invisible, 1 = title, 2 = points, 3 = seasons, 4 = awards, 5 = CTA
  const [phase, setPhase] = useState(0);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const initialTotal = initialPoints.reduce((s, e) => s + e.points, 0);
  const totalPoints = summary?.totalPoints ?? initialTotal;
  const displayPoints = useCountUp(totalPoints, 900, phase >= 2);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 80),
      setTimeout(() => setPhase(2), 650),
      setTimeout(() => {
        setPhase(3);
        setSummaryLoading(true);
        fetch(`/api/activities/${activityId}/summary`)
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((data: SummaryData) => setSummary(data))
          .catch(() => {})
          .finally(() => setSummaryLoading(false));
      }, 1400),
      setTimeout(() => setPhase(4), 2100),
      setTimeout(() => setPhase(5), 2800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [activityId]);

  const hasMeaningfulPoints = totalPoints > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-slate-950/97 backdrop-blur-sm minimal-scrollbar"
      style={{
        opacity: phase >= 1 ? 1 : 0,
        transition: "opacity 0.35s ease",
      }}
    >
      {/* Dismiss button — always visible */}
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
      >
        ✕
      </button>

      <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-10">
        {/* ── Phase 1: Title ─────────────────────────────────────────────── */}
        <div
          className="relative mb-8 text-center"
          style={{
            transform: phase >= 1 ? "translateY(0)" : "translateY(18px)",
            opacity: phase >= 1 ? 1 : 0,
            transition: "all 0.45s ease",
          }}
        >
          {phase >= 1 && <Confetti />}
          <div className="mb-3 text-5xl leading-none">💪</div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            ¡Listo!
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Actividad registrada correctamente
          </p>
        </div>

        {/* ── Phase 2: Points ────────────────────────────────────────────── */}
        <div
          className="mb-6 rounded-2xl border border-lime-500/20 bg-slate-900 p-6 text-center"
          style={{
            transform: phase >= 2 ? "translateY(0)" : "translateY(14px)",
            opacity: phase >= 2 ? 1 : 0,
            transition: "all 0.45s ease",
          }}
        >
          <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Puntos ganados
          </div>
          <div
            className="text-6xl font-black tabular-nums leading-none"
            style={{
              color: hasMeaningfulPoints ? "#a3e635" : "#64748b",
              textShadow:
                phase >= 2 && hasMeaningfulPoints
                  ? "0 0 32px rgba(163, 230, 53, 0.35)"
                  : "none",
              transition: "text-shadow 0.6s ease",
            }}
          >
            {displayPoints.toLocaleString("es")}
          </div>

          {/* Points breakdown chips — appear once summary loads */}
          {summary && summary.seasonContributions.length > 0 && (
            <div
              className="mt-4 flex flex-wrap justify-center gap-2"
              style={{ animation: "slideUp 0.35s ease-out both" }}
            >
              {summary.seasonContributions.map((sc) => (
                <span
                  key={sc.seasonId}
                  className="rounded-full bg-lime-500/10 px-3 py-1 text-xs font-medium text-lime-400"
                >
                  {sc.seasonName}: +{sc.pointsEarned}
                </span>
              ))}
            </div>
          )}

          {summary && summary.seasonContributions.length === 0 && (
            <p className="mt-3 text-xs text-slate-500">
              No participás en ninguna temporada activa
            </p>
          )}
        </div>

        {/* ── Phase 3: Season contributions ─────────────────────────────── */}
        {phase >= 3 && (
          <section
            className="mb-6"
            style={{ animation: "slideUp 0.4s ease-out both" }}
          >
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
              Contribución a temporadas
            </h2>

            <div className="space-y-3">
              {summaryLoading && !summary ? (
                // Skeleton while loading
                Array.from({ length: 2 }, (_, i) => (
                  <div key={i} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/5" />
                        <Skeleton className="h-3 w-2/5" />
                      </div>
                      <Skeleton className="h-7 w-12 shrink-0" />
                    </div>
                    <Skeleton className="mb-1.5 h-3 w-2/5" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))
              ) : summary ? (
                <>
                  {summary.seasonContributions.map((s, i) => (
                    <SeasonCard key={s.seasonId} season={s} index={i} />
                  ))}

                  {summary.nonQualifyingSeasons.map((s, i) => (
                    <div
                      key={s.seasonId}
                      className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-4"
                      style={{
                        animation: `slideUp 0.4s ease-out ${(summary.seasonContributions.length + i) * 80 + 60}ms both`,
                        opacity: 0.55,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-slate-300">
                            {s.seasonName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {s.groupName}
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <span>⚠️</span>
                            <span>{s.reasonLabel}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-sm text-slate-600">—</div>
                      </div>
                    </div>
                  ))}

                  {summary.seasonContributions.length === 0 &&
                    summary.nonQualifyingSeasons.length === 0 && (
                      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-center text-sm text-slate-500">
                        No estás en ninguna temporada activa
                      </div>
                    )}
                </>
              ) : null}
            </div>
          </section>
        )}

        {/* ── Phase 4: Awards ────────────────────────────────────────────── */}
        {phase >= 4 && (
          <section
            className="mb-6"
            style={{ animation: "slideUp 0.4s ease-out both" }}
          >
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
              Logros y medallas
            </h2>

            {summaryLoading && !summary ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }, (_, i) => (
                  <div key={i} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                    <div className="flex gap-3">
                      <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="mt-3 h-2 w-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : summary && summary.awardsProgress.length > 0 ? (() => {
              const justEarned = summary.awardsProgress.filter((a) => a.justEarned);
              const progressed = summary.awardsProgress.filter((a) => !a.justEarned);
              return (
                <div className="space-y-4">
                  {justEarned.length > 0 && (
                    <div>
                      <div className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-400">
                        ¡Desbloqueado! 🏆
                      </div>
                      <div className="space-y-3">
                        {justEarned.map((a, i) => (
                          <AwardCard key={a.id} award={a} index={i} />
                        ))}
                      </div>
                    </div>
                  )}
                  {progressed.length > 0 && (
                    <div>
                      {justEarned.length > 0 && (
                        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                          Progreso actualizado
                        </div>
                      )}
                      <div className="space-y-3">
                        {progressed.map((a, i) => (
                          <AwardCard key={a.id} award={a} index={i} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })() : summary ? (
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-center text-sm text-slate-500">
                Seguí entrenando para desbloquear medallas 🎯
              </div>
            ) : null}
          </section>
        )}

        {/* ── Phase 5: CTA ───────────────────────────────────────────────── */}
        {phase >= 3 && (
          <div
            style={{
              animation: "slideUp 0.4s ease-out both",
              animationDelay: phase >= 5 ? "0ms" : "600ms",
            }}
          >
            <button
              onClick={onClose}
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-b from-lime-500 to-lime-700 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:from-lime-400 hover:to-lime-600 active:scale-[0.98]"
            >
              ¡Continuar!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
