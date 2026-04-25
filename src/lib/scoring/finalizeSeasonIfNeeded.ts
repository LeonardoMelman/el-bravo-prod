import { prisma } from "@/src/lib/db";
import { finalizeSeasonScoring } from "@/src/lib/scoring/finalizeSeasonScoring";
import { Prisma } from "@prisma/client";


export async function finalizeSeasonIfNeeded(seasonId: string) {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: {
      id: true,
      isActive: true,
      endDate: true,
      endedAt: true,
    },
  });

  if (!season) return null;
  if (!season.isActive) return null;
  if (season.endedAt) return null;

  const now = new Date();
  if (new Date(season.endDate).getTime() > now.getTime()) {
    return null;
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    return finalizeSeasonScoring({
      tx,
      seasonId: season.id,
    });
  });
}