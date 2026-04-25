type WeekRow = {
  weekStart: Date;
  streakCount: number;
  goalReached: boolean;
  perfectWeek: boolean;
};

type Params = {
  tx: any;
  seasonId: string;
  userId: string;
  recalculatedWeeks: WeekRow[];
};

const PERFECT_WEEK_BONUS = 0;

function getWeeklyStreakBonusPoints(streakCount: number): number {
 //if (streakCount >= 6) return 150;
  //if (streakCount >= 4) return 100;
  //if (streakCount >= 2) return 50;
  return 0;
}

// Replaces the old per-week applyWeeklyBonuses loop.
// Processes all weeks for a user+season in 4 queries instead of N×5.
// Must be called outside a Prisma transaction (uses prisma client, not tx).
export async function applyAllWeeklyBonuses({
  tx,
  seasonId,
  userId,
  recalculatedWeeks,
}: Params) {
  // 1. Delete all existing weekly/perfect bonus events for this user+season at once
  await tx.scoreEvent.deleteMany({
    where: {
      seasonId,
      userId,
      type: { in: ["weekly_streak_bonus", "perfect_week_bonus"] },
    },
  });

  // 2. Compute new bonus events in-memory from the already-calculated week rows
  const bonusEvents: Array<{
    seasonId: string;
    userId: string;
    activityId: null;
    weekStart: Date;
    type: string;
    points: number;
    reason: string;
    metadata: object;
  }> = [];

  for (const week of recalculatedWeeks) {
    if (week.goalReached) {
      const streakBonus = getWeeklyStreakBonusPoints(week.streakCount);
      if (streakBonus > 0) {
        bonusEvents.push({
          seasonId,
          userId,
          activityId: null,
          weekStart: week.weekStart,
          type: "weekly_streak_bonus",
          points: streakBonus,
          reason: `Bonus por racha activa de ${week.streakCount} semanas`,
          metadata: { streakCount: week.streakCount },
        });
      }
    }

    if (week.perfectWeek) {
      bonusEvents.push({
        seasonId,
        userId,
        activityId: null,
        weekStart: week.weekStart,
        type: "perfect_week_bonus",
        points: PERFECT_WEEK_BONUS,
        reason: "Bonus por semana perfecta",
        metadata: { perfectWeek: true },
      });
    }
  }

  // 3. Batch-insert all bonus events (1 query instead of up to 2N)
  if (bonusEvents.length > 0) {
    await tx.scoreEvent.createMany({ data: bonusEvents });
  }

  // 4. Re-aggregate all score events by week in a single groupBy
  const pointsByWeek: Array<{
    weekStart: Date | null;
    _sum: { points: number | null };
  }> = await tx.scoreEvent.groupBy({
    by: ["weekStart"],
    where: { seasonId, userId, weekStart: { not: null } },
    _sum: { points: true },
  });

  // 5. Update pointsEarned for each week in parallel (rows are independent)
  await Promise.all(
    pointsByWeek
      .filter(
        (row): row is { weekStart: Date; _sum: { points: number | null } } =>
          row.weekStart !== null
      )
      .map((row) =>
        tx.seasonWeekProgress.updateMany({
          where: { seasonId, userId, weekStart: row.weekStart },
          data: { pointsEarned: row._sum.points ?? 0 },
        })
      )
  );
}
