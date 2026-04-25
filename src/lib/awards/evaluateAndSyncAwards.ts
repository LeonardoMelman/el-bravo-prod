import { prisma } from "@/src/lib/db";
import { evaluateAwardsForUser } from "@/src/lib/awards/evaluateAwards";

/**
 * Evaluates which awards a user has earned and writes missing AwardEarned records.
 * Called after every activity create / edit / delete.
 *
 * Earned badges are permanent — deleting a workout does NOT revoke them.
 * Progress is always re-derived from raw activity data (deterministic).
 *
 * @param activityId  The activity that triggered the evaluation (null for delete/edit).
 */
export async function evaluateAndSyncAwards(
  userId: string,
  activityId: string | null
): Promise<void> {
  const [awards, existingEarned] = await Promise.all([
    evaluateAwardsForUser(userId),
    prisma.awardEarned.findMany({
      where: { userId },
      select: { awardId: true },
    }),
  ]);

  const alreadyEarnedIds = new Set(existingEarned.map((e) => e.awardId));

  const newlyEarned = awards.filter(
    (a) => a.earned && !alreadyEarnedIds.has(a.id)
  );

  if (newlyEarned.length === 0) return;

  for (const award of newlyEarned) {
    const dedupeKey = `${award.id}_${userId}`;
    try {
      await prisma.awardEarned.upsert({
        where: { dedupeKey },
        create: {
          awardId: award.id,
          userId,
          activityId: activityId ?? null,
          seasonId: award.seasonId ?? null,
          dedupeKey,
          earnedAt: new Date(),
        },
        update: {},
      });
    } catch {
      // Silently ignore unique-constraint races
    }
  }
}
