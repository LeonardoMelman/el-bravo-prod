import { prisma } from "@/src/lib/db";

type ActivityType = "gym" | "run" | "sport" | "mobility" | "other";

type UserAwardMetrics = {
  userId: string;
  weeklyGoal: number;

  activityTypeWeekStreaks: Record<ActivityType, number>;
  perfectWeekStreak: number;
  weekendActivityStreak: number;
  consecutiveActiveWeekStreak: number;

  muscleGroupRolling30Days: Record<string, number>;

  totalActivitiesCount: number;
  distinctActivityTypesInLatestSeason: number;
  latestSeasonId: string | null;
};

type SlimActivity = {
  id: string;
  type: ActivityType;
  startedAt: Date;
};

type RecentActivityWithMuscles = {
  id: string;
  exercises: {
    sets: number;
    reps: number | null;
    exercise: {
      muscles: {
        percentage: number;
        muscle: {
          id: string;
          name: string;
          slug: string | null;
          groupKey: string | null;
        };
      }[];
    } | null;
  }[];
};

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

function formatWeekKey(date: Date) {
  return startOfWeek(date).toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getWeekendKey(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  let saturday: Date;
  if (day === 6) {
    saturday = new Date(d);
  } else if (day === 0) {
    saturday = addDays(d, -1);
  } else {
    saturday = addDays(d, -(day + 1));
  }
  saturday.setHours(0, 0, 0, 0);
  return saturday.toISOString().slice(0, 10);
}

function getCurrentConsecutiveStreak(keys: string[]) {
  if (keys.length === 0) return 0;

  const uniqueSorted = [...new Set(keys)].sort((a, b) => (a < b ? 1 : -1));
  let streak = 1;

  for (let i = 0; i < uniqueSorted.length - 1; i++) {
    const current = new Date(uniqueSorted[i]);
    const next = new Date(uniqueSorted[i + 1]);

    const expectedPreviousWeek = addDays(current, -7);
    expectedPreviousWeek.setHours(0, 0, 0, 0);
    next.setHours(0, 0, 0, 0);

    if (next.getTime() === expectedPreviousWeek.getTime()) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function getCurrentConsecutiveWeekendStreak(keys: string[]) {
  if (keys.length === 0) return 0;

  const uniqueSorted = [...new Set(keys)].sort((a, b) => (a < b ? 1 : -1));
  let streak = 1;

  for (let i = 0; i < uniqueSorted.length - 1; i++) {
    const current = new Date(uniqueSorted[i]);
    const next = new Date(uniqueSorted[i + 1]);

    const expectedPreviousWeekend = addDays(current, -7);
    expectedPreviousWeekend.setHours(0, 0, 0, 0);
    next.setHours(0, 0, 0, 0);

    if (next.getTime() === expectedPreviousWeekend.getTime()) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function calculateMuscleGroupShare(exercises: RecentActivityWithMuscles["exercises"]) {
  const loadsByGroup = new Map<string, number>();
  let totalLoad = 0;

  for (const ex of exercises) {
    const sets = Number(ex.sets ?? 0);
    const reps = Number(ex.reps ?? 0);
    if (sets <= 0 || reps <= 0) continue;

    const baseLoad = sets * reps;

    for (const relation of ex.exercise?.muscles ?? []) {
      const percentage = Number(relation.percentage ?? 0);
      const groupKey = relation.muscle.groupKey ?? "other";
      if (percentage <= 0) continue;
      const weightedLoad = baseLoad * (percentage / 100);
      totalLoad += weightedLoad;
      loadsByGroup.set(groupKey, (loadsByGroup.get(groupKey) ?? 0) + weightedLoad);
    }
  }

  const result = new Map<string, number>();
  if (totalLoad <= 0) return result;

  for (const [groupKey, load] of loadsByGroup.entries()) {
    result.set(groupKey, (load / totalLoad) * 100);
  }
  return result;
}

export async function getUserAwardMetrics(userId: string): Promise<UserAwardMetrics> {
  const rollingWindowStart = addDays(new Date(), -30);
  rollingWindowStart.setHours(0, 0, 0, 0);

  // Round-trip 1: three parallel queries
  // - user (weeklyGoal)
  // - all non-deleted activities (type + startedAt only — no exercise joins)
  // - recent 30-day activities with exercises+muscles (bounded window for muscle rolling calc)
  // - latest season membership
  const [user, allActivitiesRaw, recentWithMusclesRaw, latestSeasonMember] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, weeklyGoal: true } as any,
    }),
    prisma.activity.findMany({
      where: { userId, isDeleted: false },
      select: { id: true, type: true, startedAt: true },
      orderBy: { startedAt: "desc" },
    }),
    prisma.activity.findMany({
      where: { userId, isDeleted: false, startedAt: { gte: rollingWindowStart } },
      select: {
        id: true,
        exercises: {
          select: {
            sets: true,
            reps: true,
            exercise: {
              select: {
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
    }),
    prisma.seasonMember.findFirst({
      where: { userId, leftAt: null },
      orderBy: { joinedAt: "desc" },
      select: { seasonId: true },
    }),
  ]);

  if (!user) throw new Error("Usuario no encontrado");

  const weeklyGoal = Number((user as any).weeklyGoal ?? 3);
  const activities = allActivitiesRaw as unknown as SlimActivity[];
  const recentActivities = recentWithMusclesRaw as unknown as RecentActivityWithMuscles[];
  const latestSeasonId = latestSeasonMember?.seasonId ?? null;

  // ── Streak calculations (in-memory, no extra queries) ─────────────────────

  const weekKeysByType: Record<ActivityType, string[]> = {
    gym: [], run: [], sport: [], mobility: [], other: [],
  };

  const activityCountByWeek = new Map<string, number>();
  const weekendKeys: string[] = [];

  for (const activity of activities) {
    const weekKey = formatWeekKey(activity.startedAt);
    weekKeysByType[activity.type].push(weekKey);
    activityCountByWeek.set(weekKey, (activityCountByWeek.get(weekKey) ?? 0) + 1);
    if (isWeekend(activity.startedAt)) {
      weekendKeys.push(getWeekendKey(activity.startedAt));
    }
  }

  const activityTypeWeekStreaks: Record<ActivityType, number> = {
    gym: getCurrentConsecutiveStreak(weekKeysByType.gym),
    run: getCurrentConsecutiveStreak(weekKeysByType.run),
    sport: getCurrentConsecutiveStreak(weekKeysByType.sport),
    mobility: getCurrentConsecutiveStreak(weekKeysByType.mobility),
    other: getCurrentConsecutiveStreak(weekKeysByType.other),
  };

  const perfectWeekKeys = [...activityCountByWeek.entries()]
    .filter(([, count]) => count >= weeklyGoal)
    .map(([weekKey]) => weekKey);

  const activeWeekKeys = [...activityCountByWeek.keys()];

  const perfectWeekStreak = getCurrentConsecutiveStreak(perfectWeekKeys);
  const weekendActivityStreak = getCurrentConsecutiveWeekendStreak(weekendKeys);
  const consecutiveActiveWeekStreak = getCurrentConsecutiveStreak(activeWeekKeys);

  // ── Muscle group rolling 30 days (bounded to recent activities only) ───────

  const muscleGroupRolling30Days: Record<string, number> = {};

  for (const activity of recentActivities) {
    const groupShare = calculateMuscleGroupShare(activity.exercises);
    for (const [groupKey, sharePct] of groupShare.entries()) {
      if (sharePct >= 20) {
        muscleGroupRolling30Days[groupKey] = (muscleGroupRolling30Days[groupKey] ?? 0) + 1;
      }
    }
  }

  // ── Distinct activity types in latest season (raw SQL — no N+1) ───────────

  let distinctActivityTypesInLatestSeason = 0;

  if (latestSeasonId) {
    const rows = await prisma.$queryRaw<Array<{ type: string }>>`
      SELECT DISTINCT a.type
      FROM activityseason acs
      JOIN activity a ON acs.activityId = a.id
      WHERE acs.seasonId = ${latestSeasonId}
        AND a.userId    = ${userId}
        AND a.isDeleted = 0
    `;
    distinctActivityTypesInLatestSeason = rows.length;
  }

  return {
    userId,
    weeklyGoal,
    activityTypeWeekStreaks,
    perfectWeekStreak,
    weekendActivityStreak,
    consecutiveActiveWeekStreak,
    muscleGroupRolling30Days,
    totalActivitiesCount: activities.length,
    distinctActivityTypesInLatestSeason,
    latestSeasonId,
  };
}
