import { Prisma } from "@prisma/client";
import { addDays, getWeekKey, startOfWeekMonday } from "@/src/lib/scoring/weekUtils";

type Params = {
  tx: Prisma.TransactionClient;
  seasonId: string;
  userId: string;
  weeklyGoal: number;
};

function getDurationMinutes(item: {
  durationMinutes: number | null;
  startedAt: Date;
  endedAt: Date;
}) {
  if (
    typeof item.durationMinutes === "number" &&
    Number.isFinite(item.durationMinutes) &&
    item.durationMinutes > 0
  ) {
    return Math.round(item.durationMinutes);
  }

  const diff = item.endedAt.getTime() - item.startedAt.getTime();
  if (!Number.isFinite(diff) || diff <= 0) return 0;

  return Math.max(0, Math.round(diff / (1000 * 60)));
}

export async function recalculateSeasonWeekProgress({
  tx,
  seasonId,
  userId,
  weeklyGoal,
}: Params) {
  const linkedActivities = await tx.activitySeason.findMany({
    where: {
      seasonId,
      activity: {
        userId,
        isDeleted: false,
      },
    },
    select: {
      activity: {
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          durationMinutes: true,
        },
      },
    },
  });

  const weekMap = new Map<
    string,
    {
      weekStart: Date;
      activitiesCount: number;
      minutesTotal: number;
    }
  >();

  for (const item of linkedActivities) {
    const activity = item.activity;
    const weekStart = startOfWeekMonday(activity.startedAt);
    const key = getWeekKey(weekStart);

    const existing = weekMap.get(key);

    if (existing) {
      existing.activitiesCount += 1;
      existing.minutesTotal += getDurationMinutes(activity);
    } else {
      weekMap.set(key, {
        weekStart,
        activitiesCount: 1,
        minutesTotal: getDurationMinutes(activity),
      });
    }
  }

  const pointsByWeek = await tx.scoreEvent.groupBy({
  by: ["weekStart"],
  where: {
    seasonId,
    userId,
    weekStart: {
      not: null,
    },
  },
  _sum: {
    points: true,
  },
});

const pointsMap = new Map<string, number>();
for (const row of pointsByWeek) {
  if (!row.weekStart) continue;
  pointsMap.set(getWeekKey(row.weekStart), row._sum.points ?? 0);
}

  const orderedWeeks = Array.from(weekMap.values()).sort(
    (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
  );

  const computedRows: Array<{
    seasonId: string;
    userId: string;
    weekStart: Date;
    activitiesCount: number;
    minutesTotal: number;
    goalTarget: number;
    goalReached: boolean;
    perfectWeek: boolean;
    streakCount: number;
    pointsEarned: number;
  }> = [];

  let previousWeekStart: Date | null = null;
  let previousStreak = 0;

  for (const row of orderedWeeks) {
    const weekKey = getWeekKey(row.weekStart);
    const pointsEarned = pointsMap.get(weekKey) ?? 0;
    const goalReached = row.activitiesCount >= weeklyGoal;
    const perfectWeek = goalReached;

    let streakCount = 0;

    if (goalReached) {
      if (
        previousWeekStart &&
        getWeekKey(previousWeekStart) === getWeekKey(addDays(row.weekStart, -7))
      ) {
        streakCount = previousStreak + 1;
      } else {
        streakCount = 1;
      }
    }

    computedRows.push({
      seasonId,
      userId,
      weekStart: row.weekStart,
      activitiesCount: row.activitiesCount,
      minutesTotal: row.minutesTotal,
      goalTarget: weeklyGoal,
      goalReached,
      perfectWeek,
      streakCount,
      pointsEarned,
    });

    previousWeekStart = row.weekStart;
    previousStreak = streakCount;
  }

  await tx.seasonWeekProgress.deleteMany({
    where: {
      seasonId,
      userId,
    },
  });

  if (computedRows.length > 0) {
    await tx.seasonWeekProgress.createMany({
      data: computedRows,
    });
  }

  return computedRows;
}