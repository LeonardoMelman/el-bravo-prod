import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/currentUser";
import { prisma } from "@/src/lib/db";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getActivityMinutes(a: {
  durationMinutes: number | null;
  startedAt: Date;
  endedAt: Date;
}): number {
  if (a.durationMinutes != null && a.durationMinutes > 0) return a.durationMinutes;
  const diff = new Date(a.endedAt).getTime() - new Date(a.startedAt).getTime();
  if (diff <= 0) return 0;
  return Math.round(diff / 60000);
}

function startOfWeekMonday(d: Date): Date {
  const day = new Date(d).getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Returns array of Monday dates for every complete Mon–Sun week within [start, end] */
function getCompleteWeeks(start: Date, end: Date): Date[] {
  const weeks: Date[] = [];

  // Find first Monday >= start
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const day = cur.getDay();
  if (day !== 1) {
    const daysToMonday = day === 0 ? 1 : 8 - day;
    cur.setDate(cur.getDate() + daysToMonday);
  }

  while (true) {
    const sunday = new Date(cur);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    if (sunday > end) break;
    weeks.push(new Date(cur));
    cur.setDate(cur.getDate() + 7);
  }
  return weeks;
}

// ─── Main Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const startDate = sp.get("startDate");
  const endDate = sp.get("endDate");
  const mode = sp.get("mode") ?? "year";
  const prevStart = sp.get("prevStartDate");
  const prevEnd = sp.get("prevEndDate");

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "Missing date parameters" }, { status: 400 });
  }

  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T23:59:59");

  // Fetch user details
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { weeklyGoal: true, name: true, photoUrl: true },
  });
  const weeklyGoal = dbUser?.weeklyGoal ?? 3;

  // ── Fetch activities with exercises + muscle data ──────────────────────────
  const activities = await prisma.activity.findMany({
    where: { userId: user.id, isDeleted: false, startedAt: { gte: start, lte: end } },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      durationMinutes: true,
      exercises: {
        select: {
          exercise: {
            select: {
              id: true,
              muscles: {
                select: {
                  percentage: true,
                  muscle: {
                    select: { id: true, name: true, slug: true, groupKey: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { startedAt: "asc" },
  });

  // ── Basic KPIs ─────────────────────────────────────────────────────────────
  const totalTrainings = activities.length;
  const totalMinutes = activities.reduce(
    (sum, a) => sum + getActivityMinutes(a as Parameters<typeof getActivityMinutes>[0]),
    0
  );
  const minutesPerTraining = totalTrainings > 0 ? Math.round(totalMinutes / totalTrainings) : 0;

  let avgRestDays: number | null = null;
  if (totalTrainings >= 2) {
    let totalDays = 0;
    for (let i = 1; i < activities.length; i++) {
      totalDays +=
        (new Date(activities[i].startedAt).getTime() -
          new Date(activities[i - 1].startedAt).getTime()) /
        (1000 * 60 * 60 * 24);
    }
    avgRestDays = Math.round((totalDays / (totalTrainings - 1)) * 10) / 10;
  }

  // ── Complete weeks ─────────────────────────────────────────────────────────
  const completeWeeks = getCompleteWeeks(start, end);
  const hasCompleteWeeks = completeWeeks.length > 0;
  const trainingsPerWeek = hasCompleteWeeks
    ? Math.round((totalTrainings / completeWeeks.length) * 10) / 10
    : null;

  // ── Chart data ─────────────────────────────────────────────────────────────
  const trainingsByMonth: { month: number; count: number }[] = [];
  const minutesByMonth: { month: number; minutes: number }[] = [];
  const trainingsByWeek: { weekStart: string; count: number }[] = [];
  const minutesByWeek: { weekStart: string; minutes: number }[] = [];

  if (mode === "year") {
    const monthMap = new Map<number, { count: number; minutes: number }>();
    for (let m = 1; m <= 12; m++) monthMap.set(m, { count: 0, minutes: 0 });

    for (const a of activities) {
      const month = new Date(a.startedAt).getMonth() + 1;
      const mins = getActivityMinutes(a as Parameters<typeof getActivityMinutes>[0]);
      const entry = monthMap.get(month)!;
      entry.count++;
      entry.minutes += mins;
    }

    for (const [month, v] of monthMap) {
      trainingsByMonth.push({ month, count: v.count });
      minutesByMonth.push({ month, minutes: v.minutes });
    }
  } else if (hasCompleteWeeks) {
    const weekMap = new Map<string, { count: number; minutes: number }>();
    for (const w of completeWeeks) {
      weekMap.set(w.toISOString().slice(0, 10), { count: 0, minutes: 0 });
    }

    for (const a of activities) {
      const ws = startOfWeekMonday(new Date(a.startedAt));
      const key = ws.toISOString().slice(0, 10);
      if (weekMap.has(key)) {
        const entry = weekMap.get(key)!;
        entry.count++;
        entry.minutes += getActivityMinutes(a as Parameters<typeof getActivityMinutes>[0]);
      }
    }

    for (const [weekStart, v] of weekMap) {
      trainingsByWeek.push({ weekStart, count: v.count });
      minutesByWeek.push({ weekStart, minutes: v.minutes });
    }
  }

  // ── Week streak stats ──────────────────────────────────────────────────────
  type WeekStats = {
    activeWeeks: number;
    longestActiveStreak: number;
    perfectWeeks: number;
    longestPerfectStreak: number;
    completeWeeks: number;
  };
  let weekStats: WeekStats | null = null;

  if (hasCompleteWeeks) {
    const weekCounts = new Map<string, number>();
    for (const a of activities) {
      const ws = startOfWeekMonday(new Date(a.startedAt));
      const key = ws.toISOString().slice(0, 10);
      weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);
    }

    let activeWeeks = 0;
    let perfectWeeks = 0;
    let longestActiveStreak = 0;
    let longestPerfectStreak = 0;
    let curActive = 0;
    let curPerfect = 0;

    for (const weekStart of completeWeeks) {
      const key = weekStart.toISOString().slice(0, 10);
      const count = weekCounts.get(key) ?? 0;

      if (count >= 1) {
        activeWeeks++;
        curActive++;
        longestActiveStreak = Math.max(longestActiveStreak, curActive);
      } else {
        curActive = 0;
      }

      if (count >= weeklyGoal) {
        perfectWeeks++;
        curPerfect++;
        longestPerfectStreak = Math.max(longestPerfectStreak, curPerfect);
      } else {
        curPerfect = 0;
      }
    }

    weekStats = {
      activeWeeks,
      longestActiveStreak,
      perfectWeeks,
      longestPerfectStreak,
      completeWeeks: completeWeeks.length,
    };
  }

  // ── Dot stats ──────────────────────────────────────────────────────────────
  const dotStats = {
    expected: completeWeeks.length * weeklyGoal,
    done: totalTrainings,
    weeklyGoal,
    completeWeeks: completeWeeks.length,
  };

  // ── Muscle stats ───────────────────────────────────────────────────────────
  type MuscleEntry = {
    name: string;
    slug: string;
    groupKey: string;
    minutes: number;
    trainings: Set<string>;
  };
  const muscleMap = new Map<string, MuscleEntry>();

  for (const activity of activities) {
    const actMins = getActivityMinutes(
      activity as Parameters<typeof getActivityMinutes>[0]
    );
    if (activity.exercises.length === 0) continue;

    const minsPerExercise = actMins / activity.exercises.length;

    for (const ae of activity.exercises) {
      const muscles = ae.exercise.muscles;
      if (muscles.length === 0) continue;

      const totalPct = muscles.reduce((s, m) => s + m.percentage, 0);
      if (totalPct <= 0) continue;

      for (const em of muscles) {
        const pct = em.percentage / totalPct;
        const muscleTime = minsPerExercise * pct;
        const mid = em.muscle.id;

        if (!muscleMap.has(mid)) {
          muscleMap.set(mid, {
            name: em.muscle.name,
            slug: em.muscle.slug,
            groupKey: em.muscle.groupKey,
            minutes: 0,
            trainings: new Set(),
          });
        }
        const entry = muscleMap.get(mid)!;
        entry.minutes += muscleTime;
        entry.trainings.add(activity.id);
      }
    }
  }

  // Muscle group totals
  const groupMap = new Map<string, number>();
  for (const [, data] of muscleMap) {
    groupMap.set(data.groupKey, (groupMap.get(data.groupKey) ?? 0) + data.minutes);
  }

  const muscleGroupMinutes = Array.from(groupMap.entries())
    .map(([groupKey, minutes]) => ({ groupKey, minutes: Math.round(minutes) }))
    .sort((a, b) => b.minutes - a.minutes);

  // Top muscles (all, sorted by minutes)
  const allMuscles = Array.from(muscleMap.entries())
    .map(([muscleId, data]) => ({
      muscleId,
      muscleName: data.name,
      muscleSlug: data.slug,
      groupKey: data.groupKey,
      minutes: Math.round(data.minutes),
      appearances: data.trainings.size,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  const topMuscles = allMuscles.slice(0, 4);
  const topMuscleName = allMuscles[0]?.muscleName ?? "";
  const topMuscleAppearances = allMuscles[0]?.appearances ?? 0;

  // ── Weekday minutes (0=Mon … 6=Sun) ───────────────────────────────────────
  const weekdayMap = new Map<number, number>();
  for (let d = 0; d <= 6; d++) weekdayMap.set(d, 0);

  for (const a of activities) {
    const jsDay = new Date(a.startedAt).getDay(); // 0=Sun
    const monFirst = jsDay === 0 ? 6 : jsDay - 1;
    weekdayMap.set(
      monFirst,
      (weekdayMap.get(monFirst) ?? 0) +
        getActivityMinutes(a as Parameters<typeof getActivityMinutes>[0])
    );
  }

  const dayNames = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
  const minutesByWeekday = Array.from(weekdayMap.entries()).map(([day, minutes]) => ({
    day,
    dayName: dayNames[day],
    minutes,
  }));

  // ── Time-slot minutes ──────────────────────────────────────────────────────
  const slotOrder = ["manana", "tarde", "noche", "madrugada"] as const;
  const slotMap = new Map<string, number>(slotOrder.map((s) => [s, 0]));

  for (const a of activities) {
    const hour = new Date(a.startedAt).getHours();
    const mins = getActivityMinutes(a as Parameters<typeof getActivityMinutes>[0]);
    const slot =
      hour >= 6 && hour < 12
        ? "manana"
        : hour >= 12 && hour < 18
        ? "tarde"
        : hour >= 18
        ? "noche"
        : "madrugada";
    slotMap.set(slot, (slotMap.get(slot) ?? 0) + mins);
  }

  const slotLabels: Record<string, string> = {
    manana: "mañana",
    tarde: "tarde",
    noche: "noche",
    madrugada: "madrugada",
  };
  const minutesByTimeSlot = slotOrder.map((slot) => ({
    slot,
    label: slotLabels[slot],
    minutes: slotMap.get(slot) ?? 0,
  }));

  // ── Comparison period ──────────────────────────────────────────────────────
  let prevTotalTrainings: number | null = null;
  let prevTotalMinutes: number | null = null;

  if (prevStart && prevEnd) {
    const pStart = new Date(prevStart + "T00:00:00");
    const pEnd = new Date(prevEnd + "T23:59:59");

    const prevActivities = await prisma.activity.findMany({
      where: {
        userId: user.id,
        isDeleted: false,
        startedAt: { gte: pStart, lte: pEnd },
      },
      select: { id: true, startedAt: true, endedAt: true, durationMinutes: true },
    });

    prevTotalTrainings = prevActivities.length;
    prevTotalMinutes = prevActivities.reduce(
      (sum, a) => sum + getActivityMinutes(a as Parameters<typeof getActivityMinutes>[0]),
      0
    );
  }

  return NextResponse.json({
    user: { name: dbUser?.name ?? null, photoUrl: dbUser?.photoUrl ?? null },
    totalTrainings,
    totalMinutes,
    trainingsPerWeek,
    minutesPerTraining,
    avgRestDays,
    prevTotalTrainings,
    prevTotalMinutes,
    trainingsByMonth,
    minutesByMonth,
    trainingsByWeek,
    minutesByWeek,
    weekStats,
    dotStats,
    muscleGroupMinutes,
    topMuscles,
    topMuscleName,
    topMuscleAppearances,
    minutesByWeekday,
    minutesByTimeSlot,
    mode,
    hasCompleteWeeks,
    weeklyGoal,
  });
}
