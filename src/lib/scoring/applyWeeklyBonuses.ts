type Params = {
  tx: any;
  seasonId: string;
  userId: string;
  weekStart: Date;
};

function getWeeklyStreakBonusPoints(streakCount: number) {
  if (streakCount >= 6) return 15;
  if (streakCount >= 4) return 10;
  if (streakCount >= 2) return 5;
  return 0;
}

export async function applyWeeklyBonuses({
  tx,
  seasonId,
  userId,
  weekStart,
}: Params) {
  const progress = await tx.seasonWeekProgress.findUnique({
    where: {
      seasonId_userId_weekStart: {
        seasonId,
        userId,
        weekStart,
      },
    },
    select: {
      seasonId: true,
      userId: true,
      weekStart: true,
      goalReached: true,
      perfectWeek: true,
      streakCount: true,
    },
  });

  await tx.scoreEvent.deleteMany({
    where: {
      seasonId,
      userId,
      weekStart,
      type: {
        in: ["weekly_streak_bonus", "perfect_week_bonus"],
      },
    },
  });

  if (!progress) {
    return;
  }

  if (progress.goalReached) {
    const streakBonusPoints = getWeeklyStreakBonusPoints(progress.streakCount);

    if (streakBonusPoints > 0) {
      await tx.scoreEvent.create({
        data: {
          seasonId,
          userId,
          activityId: null,
          weekStart,
          type: "weekly_streak_bonus",
          points: streakBonusPoints,
          reason: `Bonus por racha activa de ${progress.streakCount} semanas`,
          metadata: {
            streakCount: progress.streakCount,
          },
        },
      });
    }
  }

  if (progress.perfectWeek) {
    await tx.scoreEvent.create({
      data: {
        seasonId,
        userId,
        activityId: null,
        weekStart,
        type: "perfect_week_bonus",
        points: 10,
        reason: "Bonus por semana perfecta",
        metadata: {
          perfectWeek: true,
        },
      },
    });
  }

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

  await tx.seasonWeekProgress.update({
    where: {
      seasonId_userId_weekStart: {
        seasonId,
        userId,
        weekStart,
      },
    },
    data: {
      pointsEarned: pointsAggregate._sum.points ?? 0,
    },
  });
}