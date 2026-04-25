"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BadgeItem = {
  id: string;
  code: string;
  name: string;
  description: string;
  iconKey: string | null;
  category: string | null;
  level: number | null;
  scope: string;
  pointsBonus: number;
  earned: boolean;
  progressCurrent: number;
  progressTarget: number;
  progressPct: number;
  seasonId: string | null;
};

type Props = { awards: BadgeItem[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBadgeEmoji(iconKey: string | null, category: string | null): string {
  const map: Record<string, string> = {
    "el-persistente": "💪",
    "gym-rat": "🏋️",
    "strength-rat": "⚡",
    imparable: "🔥",
    "corre-forrest": "🏃",
    "el-piernas": "🦵",
    "six-pack": "🎯",
    todoterreno: "🌍",
    "el-constante": "📅",
    "el-movimiento": "🧘",
    debut: "🌟",
    veterano: "⭐",
    "el-centenario": "💯",
  };
  if (iconKey && map[iconKey]) return map[iconKey];
  const catMap: Record<string, string> = {
    consistency: "🔥",
    running: "🏃",
    muscle: "💪",
    variety: "🌈",
    recovery: "🧘",
    milestone: "⭐",
  };
  return catMap[category ?? ""] ?? "🏅";
}

function getTierLabel(level: number | null): string {
  return ["", "Bronce", "Plata", "Oro", "Bravo"][level ?? 0] ?? "";
}

function getCategoryLabel(category: string | null): string {
  const map: Record<string, string> = {
    consistency: "Constancia",
    running: "Running",
    muscle: "Músculo",
    variety: "Variedad",
    recovery: "Recuperación",
    milestone: "Hito",
  };
  return map[category ?? ""] ?? (category ?? "");
}

type TierStyle = { ring: string; glow: string; tierText: string; iconBg: string };

function getTierStyle(level: number | null, earned: boolean): TierStyle {
  if (!earned) {
    return {
      ring: "border-slate-600",
      glow: "",
      tierText: "text-slate-500",
      iconBg: "bg-slate-800",
    };
  }
  switch (level) {
    case 3:
      return {
        ring: "border-yellow-400",
        glow: "shadow-[0_0_14px_3px_rgba(250,204,21,0.25)]",
        tierText: "text-yellow-400",
        iconBg: "bg-yellow-500/15",
      };
    case 2:
      return {
        ring: "border-slate-300",
        glow: "shadow-[0_0_14px_3px_rgba(203,213,225,0.2)]",
        tierText: "text-slate-300",
        iconBg: "bg-slate-300/10",
      };
    default:
      return {
        ring: "border-amber-500",
        glow: "shadow-[0_0_12px_2px_rgba(245,158,11,0.2)]",
        tierText: "text-amber-500",
        iconBg: "bg-amber-500/10",
      };
  }
}

// ─── Animated progress bar ────────────────────────────────────────────────────

function Bar({ pct, earned }: { pct: number; earned: boolean }) {
  const color = earned
    ? "bg-gradient-to-r from-lime-500 to-lime-400"
    : "bg-gradient-to-r from-slate-500 to-slate-400";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700/60">
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

// ─── Single badge card (compact, used in top-6 grid) ─────────────────────────

function BadgeCard({
  award,
  onClick,
}: {
  award: BadgeItem;
  onClick: () => void;
}) {
  const style = getTierStyle(award.level, award.earned);
  const emoji = getBadgeEmoji(award.iconKey, award.category);
  const tier = getTierLabel(award.level);

  return (
    <button
      onClick={onClick}
      className="group flex w-full flex-col items-center gap-2 rounded-xl p-3 text-left transition hover:bg-slate-800/60"
    >
      {/* Icon circle */}
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full border-[3px] text-2xl transition group-hover:scale-105 ${style.ring} ${style.iconBg} ${style.glow}`}
      >
        {award.earned ? emoji : <span className="opacity-30">{emoji}</span>}
      </div>

      {/* Name */}
      <div className="w-full text-center">
        <div
          className={`truncate text-xs font-semibold leading-tight ${award.earned ? "text-white" : "text-slate-500"}`}
          title={award.name}
        >
          {award.name}
        </div>
        {tier ? (
          <div className={`mt-0.5 text-[10px] font-medium ${style.tierText}`}>{tier}</div>
        ) : null}
      </div>

      {/* Progress bar */}
      <div className="w-full px-1">
        <Bar pct={award.progressPct} earned={award.earned} />
        {!award.earned && (
          <div className="mt-0.5 text-center text-[10px] text-slate-500">
            {award.progressCurrent}/{award.progressTarget}
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Badge list row (used inside the "Ver todas" modal) ───────────────────────

function BadgeRow({
  award,
  onClick,
}: {
  award: BadgeItem;
  onClick: () => void;
}) {
  const style = getTierStyle(award.level, award.earned);
  const emoji = getBadgeEmoji(award.iconKey, award.category);
  const tier = getTierLabel(award.level);

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-slate-800"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-lg ${style.ring} ${style.iconBg} ${style.glow}`}
      >
        {award.earned ? emoji : <span className="opacity-30 text-base">{emoji}</span>}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`truncate text-sm font-semibold ${award.earned ? "text-white" : "text-slate-400"}`}
          >
            {award.name}
          </span>
          {tier && (
            <span className={`shrink-0 text-xs ${style.tierText}`}>{tier}</span>
          )}
        </div>
        <div className="mt-1">
          <Bar pct={award.progressPct} earned={award.earned} />
        </div>
        <div className="mt-0.5 text-[11px] text-slate-500">
          {award.earned
            ? "Completado"
            : `${award.progressCurrent} / ${award.progressTarget} · ${award.progressPct}%`}
        </div>
      </div>

      <div className="shrink-0 text-slate-500 text-xs">›</div>
    </button>
  );
}

// ─── Badge Detail Panel ───────────────────────────────────────────────────────

const TIERS = [
  { level: 1, label: "Bronce", color: "text-amber-500" },
  { level: 2, label: "Plata", color: "text-slate-300" },
  { level: 3, label: "Oro", color: "text-yellow-400" },
];

function BadgeDetail({
  award,
  allAwards,
  onBack,
}: {
  award: BadgeItem;
  allAwards: BadgeItem[];
  onBack: () => void;
}) {
  const style = getTierStyle(award.level, award.earned);
  const emoji = getBadgeEmoji(award.iconKey, award.category);

  // Find sibling tiers (same iconKey / same base code)
  const baseCode = award.code.replace(/_L\d+$/, "");
  const siblings = allAwards
    .filter((a) => a.code.startsWith(baseCode))
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0));

  const hasTiers = siblings.length > 1;
  const remaining = award.progressTarget - award.progressCurrent;

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-5 flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
      >
        ← Volver
      </button>

      {/* Large icon */}
      <div className="mb-6 flex flex-col items-center gap-3">
        <div
          className={`flex h-24 w-24 items-center justify-center rounded-full border-4 text-5xl ${style.ring} ${style.iconBg} ${style.glow}`}
          style={{ animation: award.earned ? "pulseGlow 3s ease-in-out infinite" : "none" }}
        >
          {emoji}
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-white">{award.name}</div>
          <div className="mt-1 flex items-center justify-center gap-2 text-xs text-slate-400">
            <span>{getCategoryLabel(award.category)}</span>
            {award.level && (
              <>
                <span>·</span>
                <span className={style.tierText}>{getTierLabel(award.level)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-sm leading-relaxed text-slate-300">
        {award.description}
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-300">Progreso</span>
          <span className={award.earned ? "font-bold text-lime-400" : "text-slate-400"}>
            {award.earned ? "¡Completado! ✓" : `${award.progressCurrent} / ${award.progressTarget}`}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full rounded-full transition-[width] duration-1000 ease-out ${
              award.earned
                ? "bg-gradient-to-r from-lime-500 to-lime-400"
                : "bg-gradient-to-r from-amber-500 to-amber-400"
            }`}
            style={{ width: `${award.progressPct}%` }}
          />
        </div>
        {!award.earned && remaining > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            Faltan {remaining}{" "}
            {award.progressTarget > 10 ? "entrenamientos" : "semanas"} para desbloquearlo
          </p>
        )}
      </div>

      {/* Tier progression */}
      {hasTiers && (
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Niveles
          </div>
          <div className="space-y-2">
            {siblings.map((sibling) => {
              const sibStyle = getTierStyle(sibling.level, sibling.earned);
              const sibEmoji = getBadgeEmoji(sibling.iconKey, sibling.category);
              const isCurrent = sibling.id === award.id;
              return (
                <div
                  key={sibling.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                    isCurrent
                      ? "border-slate-600 bg-slate-800"
                      : "border-transparent bg-slate-900/50"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-base ${sibStyle.ring} ${sibStyle.iconBg}`}
                  >
                    {sibling.earned ? sibEmoji : <span className="opacity-25">{sibEmoji}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-medium ${sibling.earned ? "text-white" : "text-slate-500"}`}
                    >
                      {sibling.name}
                    </div>
                    <div className={`text-xs ${sibStyle.tierText}`}>
                      {getTierLabel(sibling.level)}
                    </div>
                  </div>
                  {sibling.earned && (
                    <span className="text-lime-400 text-sm">✓</span>
                  )}
                  {isCurrent && !sibling.earned && (
                    <span className="text-xs text-slate-500">{sibling.progressPct}%</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── All-badges modal ─────────────────────────────────────────────────────────

const CATEGORY_GROUPS = [
  { key: "consistency", label: "Constancia" },
  { key: "milestone", label: "Hitos" },
  { key: "running", label: "Running" },
  { key: "muscle", label: "Músculo" },
  { key: "variety", label: "Variedad" },
  { key: "recovery", label: "Recuperación" },
];

function AllBadgesModal({
  awards,
  onClose,
}: {
  awards: BadgeItem[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<BadgeItem | null>(null);
  const [activeGroup, setActiveGroup] = useState<"earned" | "inprogress" | "locked">("earned");

  if (selected) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-slate-950/98 backdrop-blur-sm minimal-scrollbar">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>
        <div className="mx-auto w-full max-w-lg px-4 py-12">
          <BadgeDetail
            award={selected}
            allAwards={awards}
            onBack={() => setSelected(null)}
          />
        </div>
      </div>
    );
  }

  const earned = awards.filter((a) => a.earned);
  const inProgress = awards.filter((a) => !a.earned && a.progressPct > 0);
  const locked = awards.filter((a) => !a.earned && a.progressPct === 0);

  const tabs = [
    { key: "earned" as const, label: `Ganados (${earned.length})` },
    { key: "inprogress" as const, label: `En progreso (${inProgress.length})` },
    { key: "locked" as const, label: `Sin empezar (${locked.length})` },
  ];

  const visibleAwards =
    activeGroup === "earned"
      ? earned
      : activeGroup === "inprogress"
      ? inProgress
      : locked;

  // Group visible awards by category
  const grouped = CATEGORY_GROUPS.map((g) => ({
    ...g,
    items: visibleAwards.filter((a) => a.category === g.key),
  })).filter((g) => g.items.length > 0);

  const uncategorized = visibleAwards.filter(
    (a) => !CATEGORY_GROUPS.some((g) => g.key === a.category)
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-slate-950/98 backdrop-blur-sm minimal-scrollbar">
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
      >
        ✕
      </button>

      <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-10">
        <h2 className="mb-6 text-2xl font-black text-white">Todos los badges</h2>

        {/* Tab bar */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-slate-900 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveGroup(tab.key)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                activeGroup === tab.key
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {visibleAwards.length === 0 && (
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-6 text-center text-sm text-slate-500">
            {activeGroup === "earned"
              ? "Todavía no ganaste ningún badge. ¡Seguí entrenando!"
              : activeGroup === "inprogress"
              ? "Ningún badge en progreso. ¡Comenzá a entrenar!"
              : "¡Todos los badges están en progreso o completados!"}
          </div>
        )}

        {/* Category groups */}
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.key}>
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                {group.label}
              </div>
              <div className="divide-y divide-slate-800 rounded-xl border border-slate-700/60 bg-slate-900/50">
                {group.items.map((award) => (
                  <BadgeRow
                    key={award.id}
                    award={award}
                    onClick={() => setSelected(award)}
                  />
                ))}
              </div>
            </div>
          ))}
          {uncategorized.length > 0 && (
            <div className="divide-y divide-slate-800 rounded-xl border border-slate-700/60 bg-slate-900/50">
              {uncategorized.map((award) => (
                <BadgeRow
                  key={award.id}
                  award={award}
                  onClick={() => setSelected(award)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────

export default function BadgesSection({ awards }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [detailAward, setDetailAward] = useState<BadgeItem | null>(null);

  const earnedCount = awards.filter((a) => a.earned).length;

  // Top 6: earned first, then by progressPct desc, then by level desc
  const top6 = [...awards]
    .sort((a, b) => {
      if (a.earned !== b.earned) return a.earned ? -1 : 1;
      if (b.progressPct !== a.progressPct) return b.progressPct - a.progressPct;
      return (b.level ?? 0) - (a.level ?? 0);
    })
    .slice(0, 6);

  const handleBadgeClick = (award: BadgeItem) => {
    setDetailAward(award);
    setShowModal(true);
  };

  return (
    <>
      {/* Inline section */}
      <div>
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Badges
            </span>
            <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
              {earnedCount} / {awards.length}
            </span>
          </div>
          <button
            onClick={() => {
              setDetailAward(null);
              setShowModal(true);
            }}
            className="text-xs font-medium text-lime-400 hover:text-lime-300 transition-colors"
          >
            Ver todas →
          </button>
        </div>

        {/* Top-6 grid */}
        {awards.length === 0 ? (
          <div className="rounded-xl bg-slate-800 p-4 text-center text-sm text-slate-400">
            No hay badges definidos todavía.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {top6.map((award) => (
              <BadgeCard
                key={award.id}
                award={award}
                onClick={() => handleBadgeClick(award)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Full modal */}
      {showModal && !detailAward && (
        <AllBadgesModal awards={awards} onClose={() => setShowModal(false)} />
      )}

      {/* Direct detail modal (from inline grid click) */}
      {showModal && detailAward && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-slate-950/98 backdrop-blur-sm minimal-scrollbar">
          <button
            onClick={() => { setShowModal(false); setDetailAward(null); }}
            aria-label="Cerrar"
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
          <div className="mx-auto w-full max-w-lg px-4 py-12">
            <BadgeDetail
              award={detailAward}
              allAwards={awards}
              onBack={() => { setShowModal(false); setDetailAward(null); }}
            />
          </div>
        </div>
      )}
    </>
  );
}
