import { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/db";

type DbClient = PrismaClient | Prisma.TransactionClient;


  export type SeasonLeaderboardEntry = {
    userId: string;
    name: string | null;
    email: string | null;
    photoUrl: string | null;
    points: number;
    rank: number;
    activeWeeks?: number;
    perfectWeeks?: number;
  };

export async function getSeasonLeaderboard(
  seasonId: string,
  db: DbClient = prisma
) {
  const grouped = await db.scoreEvent.groupBy({
    by: ["userId"],
    where: { seasonId },
    _sum: {
      points: true,
    },
    orderBy: {
      _sum: {
        points: "desc",
      },
    },
  });

  const userIds = grouped.map((row) => row.userId);

  const users = await db.user.findMany({
    where: {
      id: { in: userIds },
    },
    select: {
      id: true,
      name: true,
      email: true,
      photoUrl: true,
    },
  });

  const userMap = new Map(users.map((user) => [user.id, user]));

  let currentRank = 0;
  let previousPoints: number | null = null;

  return grouped.map((row, index) => {
    const points = row._sum.points ?? 0;

    if (previousPoints === null || points !== previousPoints) {
      currentRank = index + 1;
    }

    previousPoints = points;

    const user = userMap.get(row.userId);

    return {
      userId: row.userId,
      name: user?.name ?? null,
      email: user?.email ?? null,
      photoUrl: user?.photoUrl ?? null,
      points,
      rank: currentRank,
    };
  });
}