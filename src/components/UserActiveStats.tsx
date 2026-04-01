"use client";

type WorkoutLike = {
  date?: Date | string;
  startedAt?: Date | string;
};

type Props = {
  activities: WorkoutLike[];
  weeklyRequired: number;
};

function toLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Lunes como inicio de semana
function startOfWeekMonday(d: Date) {
  const day = d.getDay(); // 0 = domingo, 1 = lunes, ...
  const diff = day === 0 ? -6 : 1 - day; // si es domingo, ir 6 días atrás
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return toLocalDay(monday);
}

function getActivityDate(a: WorkoutLike): Date | null {
  const raw = (a.date ?? a.startedAt) as Date | string | undefined;
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function computeStreaks(
  activities: WorkoutLike[],
  weeklyRequired: number
): {
  normalStreak: number;
  goldenStreak: number;
  currentWeekCount: number;
} {
  if (!activities.length || weeklyRequired <= 0) {
    return { normalStreak: 0, goldenStreak: 0, currentWeekCount: 0 };
  }

  const weekCounts = new Map<string, number>();
  let earliestWeekStart: Date | null = null;

  for (const a of activities) {
    const d = getActivityDate(a);
    if (!d) continue;

    const weekStart = startOfWeekMonday(d);
    const key = weekStart.toISOString().slice(0, 10);

    weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);

    if (!earliestWeekStart || weekStart < earliestWeekStart) {
      earliestWeekStart = weekStart;
    }
  }

  if (!earliestWeekStart) {
    return { normalStreak: 0, goldenStreak: 0, currentWeekCount: 0 };
  }

  const today = new Date();
  const currentWeekStart = startOfWeekMonday(today);
  const currentWeekKey = currentWeekStart.toISOString().slice(0, 10);
  const currentWeekCount = weekCounts.get(currentWeekKey) ?? 0;

  let normalStreak = 0;
  let goldenStreak = 0;

  for (
    let w = new Date(earliestWeekStart);
    w <= currentWeekStart;
    w.setDate(w.getDate() + 7)
  ) {
    const weekStart = toLocalDay(w);
    const key = weekStart.toISOString().slice(0, 10);
    const count = weekCounts.get(key) ?? 0;
    const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime();

    if (isCurrentWeek) {
      if (count >= 1) {
        normalStreak += 1;
      }
    } else {
      if (count >= 1) {
        normalStreak += 1;
      } else {
        normalStreak = 0;
      }
    }

    if (isCurrentWeek) {
      if (count >= weeklyRequired) {
        goldenStreak += 1;
      }
    } else {
      if (count >= weeklyRequired) {
        goldenStreak += 1;
      } else {
        goldenStreak = 0;
      }
    }
  }

  return { normalStreak, goldenStreak, currentWeekCount };
}

export default function UserActiveStats({ activities, weeklyRequired }: Props) {
  const { normalStreak, goldenStreak, currentWeekCount } = computeStreaks(
    activities,
    weeklyRequired
  );

  const baseCircles = Math.max(weeklyRequired, 0);
  const hasExtra = currentWeekCount > weeklyRequired;

  return (
    <div className="mt-[10px] grid w-full grid-cols-2 gap-[10px] sm:flex sm:gap-3">
      {/* Card 1 - semanas activas */}
      <div className="rounded-lg bg-[#3b4f6c] p-4 sm:w-1/3">
        <div className="text-center text-5xl font-bold text-white">{normalStreak}</div>
        <div className="text-center text-md font-semibold text-white/80">
          semanas activas
        </div>
      </div>

      {/* Card 2 - semanas perfectas */}
      <div className="rounded-lg bg-lime-600 p-4 sm:w-1/3">
        <div className="text-center text-5xl font-bold text-white">{goldenStreak}</div>
        <div className="text-center text-md font-semibold text-white/80">
          semanas perfectas
        </div>
      </div>

      {/* Card 3 - entrenamientos esta semana */}
      <div className="col-span-2 min-w-[270px] rounded-lg bg-[#1f2f4a] p-4 sm:w-1/3">
        <div className="mb-2 flex justify-center gap-4">
          {Array.from({ length: baseCircles }).map((_, idx) => {
            const filled = idx < currentWeekCount;

            return (
              <div
                key={idx}
                className={
                  "h-11 w-11 rounded-full border-[6px] transition-colors " +
                  (filled
                    ? "border-[#465902] bg-gradient-to-b from-[#8AC617] to-[#63710B]"
                    : "border-[#41556f] bg-transparent")
                }
              />
            );
          })}

          {hasExtra && (
            <div
              className="h-11 w-11 rounded-full border-[6px] border-[#90AB3A] bg-gradient-to-b from-[#E6FFBE] to-[#9FFF00]"
              title="Entrenamientos extra esta semana"
            />
          )}
        </div>

        <div className="text-center text-md font-semibold text-white/80">
          entrenamientos esta semana
        </div>
      </div>
    </div>
  );
}