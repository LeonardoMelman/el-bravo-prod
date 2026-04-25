import { Prisma } from "@prisma/client";

type WeekRow = {
  weekStart: Date;
  streakCount: number;
  goalReached: boolean;
  perfectWeek: boolean;
};

type Params = {
  tx: Prisma.TransactionClient;
  seasonId: string;
  userId: string;
  recalculatedWeeks: WeekRow[];
};

export async function applyAllWeeklyBonuses({
  tx,
  seasonId,
  userId,
}: Params) {
  await tx.scoreEvent.deleteMany({
    where: {
      seasonId,
      userId,
      type: { in: ["weekly_streak_bonus", "perfect_week_bonus"] },
    },
  });

  const bonusEvents: Prisma.ScoreEventCreateManyInput[] = [];

  if (bonusEvents.length > 0) {
    await tx.scoreEvent.createMany({
      data: bonusEvents,
    });
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

  await Promise.all(
    pointsByWeek
      .filter((row): row is typeof row & { weekStart: Date } => {
        return row.weekStart !== null;
      })
      .map((row) =>
        tx.seasonWeekProgress.updateMany({
          where: {
            seasonId,
            userId,
            weekStart: row.weekStart,
          },
          data: {
            pointsEarned: row._sum.points ?? 0,
          },
        })
      )
  );
}