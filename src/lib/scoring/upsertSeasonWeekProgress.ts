import { Prisma } from "@prisma/client";
import { addDays, getWeekKey, startOfWeekMonday } from "@/src/lib/scoring/weekUtils";

type Params = {
  tx: Prisma.TransactionClient;
  seasonId: string;
  userId: string;
  weekDate: Date;
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

export async function upsertSeasonWeekProgress({
  tx,
  seasonId,
  userId,
  weekDate,
  weeklyGoal,
}: Params) {
  const weekStart = startOfWeekMonday(weekDate);
  const weekEnd = addDays(weekStart, 7);

  const linkedActivities = await tx.activitySeason.findMany({
    where: {
      seasonId,
      activity: {
        userId,
        isDeleted: false,
        startedAt: {
          gte: weekStart,
          lt: weekEnd,
        },
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

  const activitiesCount = linkedActivities.length;
  const minutesTotal = linkedActivities.reduce((sum, item) => {
    return sum + getDurationMinutes(item.activity);
  }, 0);

  const pointsAggregate = await tx.scoreEvent.aggregate({
    where: {
      seasonId,
      userId,
      weekStart,
    },
    _sum: {
      points: true,
    },
  });

  const pointsEarned = pointsAggregate._sum.points ?? 0;
  const goalTarget = weeklyGoal;
  const goalReached = activitiesCount >= goalTarget;
  const perfectWeek = goalReached;

  const previousWeeks = await tx.seasonWeekProgress.findMany({
    where: {
      seasonId,
      userId,
      weekStart: {
        lt: weekStart,
      },
    },
    orderBy: {
      weekStart: "desc",
    },
    select: {
      weekStart: true,
      goalReached: true,
    },
  });

  let streakCount = goalReached ? 1 : 0;
  let cursor = addDays(weekStart, -7);

  if (goalReached) {
    for (const prev of previousWeeks) {
      const expectedKey = getWeekKey(cursor);
      const prevKey = getWeekKey(prev.weekStart);

      if (prevKey !== expectedKey) break;
      if (!prev.goalReached) break;

      streakCount += 1;
      cursor = addDays(cursor, -7);
    }
  }

  await tx.seasonWeekProgress.upsert({
    where: {
      seasonId_userId_weekStart: {
        seasonId,
        userId,
        weekStart,
      },
    },
    create: {
      seasonId,
      userId,
      weekStart,
      activitiesCount,
      minutesTotal,
      goalTarget,
      goalReached,
      perfectWeek,
      streakCount,
      pointsEarned,
    },
    update: {
      activitiesCount,
      minutesTotal,
      goalTarget,
      goalReached,
      perfectWeek,
      streakCount,
      pointsEarned,
    },
  });

  return {
    weekStart,
    activitiesCount,
    minutesTotal,
    goalTarget,
    goalReached,
    perfectWeek,
    streakCount,
    pointsEarned,
  };
}