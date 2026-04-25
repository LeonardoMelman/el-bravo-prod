import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/currentUser";
import { prisma } from "@/src/lib/db";
import { evaluateAwardsForUser } from "@/src/lib/awards/evaluateAwards";
import { startOfWeekMonday } from "@/src/lib/scoring/weekUtils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: activityId } = await params;

  const activity = await prisma.activity.findUnique({
    where: { id: activityId, userId: user.id, isDeleted: false },
    select: {
      id: true,
      durationMinutes: true,
      startedAt: true,
      activityCategoryId: true,
      activityCategory: { select: { name: true } },
    },
  });

  if (!activity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const weekStart = startOfWeekMonday(activity.startedAt);

  const [scoreEvents, activitySeasons, allUserSeasons, justEarnedRecords] =
    await Promise.all([
      prisma.scoreEvent.findMany({
        where: { activityId, userId: user.id },
        select: {
          seasonId: true,
          type: true,
          points: true,
          metadata: true,
          season: {
            select: { id: true, name: true, group: { select: { name: true } } },
          },
        },
      }),
      prisma.activitySeason.findMany({
        where: { activityId },
        select: { seasonId: true },
      }),
      prisma.season.findMany({
        where: {
          isActive: true,
          startDate: { lte: activity.startedAt },
          endDate: { gte: activity.startedAt },
          members: { some: { userId: user.id, leftAt: null } },
        },
        select: {
          id: true,
          name: true,
          minDuration: true,
          allowedActivityTypeLinks: { select: { activityCategoryId: true } },
          group: { select: { name: true } },
        },
      }),
      prisma.awardEarned.findMany({
        where: { activityId, userId: user.id },
        select: { awardId: true },
      }),
    ]);

  const qualifyingSeasonIds = new Set(activitySeasons.map((a) => a.seasonId));
  const justEarnedAwardIds = new Set(justEarnedRecords.map((a) => a.awardId));

  const weekProgresses =
    qualifyingSeasonIds.size > 0
      ? await prisma.seasonWeekProgress.findMany({
          where: {
            userId: user.id,
            weekStart,
            seasonId: { in: Array.from(qualifyingSeasonIds) },
          },
        })
      : [];

  const weekProgressById = new Map(weekProgresses.map((wp) => [wp.seasonId, wp]));

  const seasonContributions: {
    seasonId: string;
    seasonName: string;
    groupName: string;
    pointsEarned: number;
    basePoints: number;
    bonusPoints: number;
    consistencyMultiplier: number | null;
    comebackBonus: number | null;
    weekProgress: {
      activitiesCount: number;
      goalTarget: number;
      goalReached: boolean;
      perfectWeek: boolean;
      streakCount: number;
    } | null;
  }[] = [];

  const nonQualifyingSeasons: {
    seasonId: string;
    seasonName: string;
    groupName: string;
    reasonLabel: string;
  }[] = [];

  for (const season of allUserSeasons) {
    if (qualifyingSeasonIds.has(season.id)) {
      const events = scoreEvents.filter((e) => e.seasonId === season.id);
      const baseEvent = events.find((e) => e.type === "activity_base");
      const totalPoints = events.reduce((s, e) => s + e.points, 0);
      const wp = weekProgressById.get(season.id) ?? null;
      const meta = (baseEvent?.metadata ?? null) as Record<string, unknown> | null;

      seasonContributions.push({
        seasonId: season.id,
        seasonName: season.name,
        groupName: season.group.name,
        pointsEarned: totalPoints,
        basePoints: baseEvent?.points ?? 0,
        bonusPoints: totalPoints - (baseEvent?.points ?? 0),
        consistencyMultiplier:
          typeof meta?.consistencyMultiplier === "number"
            ? meta.consistencyMultiplier
            : null,
        comebackBonus:
          typeof meta?.comebackBonus === "number" ? meta.comebackBonus : null,
        weekProgress: wp
          ? {
              activitiesCount: wp.activitiesCount,
              goalTarget: wp.goalTarget,
              goalReached: wp.goalReached,
              perfectWeek: wp.perfectWeek,
              streakCount: wp.streakCount,
            }
          : null,
      });
    } else {
      const allowedIds = season.allowedActivityTypeLinks.map(
        (l) => l.activityCategoryId
      );
      let reasonLabel: string;

      if (
        allowedIds.length > 0 &&
        activity.activityCategoryId &&
        !allowedIds.includes(activity.activityCategoryId)
      ) {
        reasonLabel = "Tipo de actividad no permitido en esta temporada";
      } else if (
        season.minDuration &&
        (activity.durationMinutes ?? 0) < season.minDuration
      ) {
        reasonLabel = `Duración mínima: ${season.minDuration} min`;
      } else {
        reasonLabel = "No calificó para esta temporada";
      }

      nonQualifyingSeasons.push({
        seasonId: season.id,
        seasonName: season.name,
        groupName: season.group.name,
        reasonLabel,
      });
    }
  }

  const allAwards = await evaluateAwardsForUser(user.id);

  const awardsProgress = allAwards
    .map((a) => ({ ...a, justEarned: justEarnedAwardIds.has(a.id) }))
    .filter((a) => a.justEarned || a.progressPct >= 40)
    .sort((a, b) => {
      if (a.justEarned !== b.justEarned) return a.justEarned ? -1 : 1;
      return b.progressPct - a.progressPct;
    })
    .slice(0, 8);

  return NextResponse.json({
    activity: {
      id: activity.id,
      durationMinutes: activity.durationMinutes ?? 0,
      categoryName: activity.activityCategory?.name ?? "Actividad",
    },
    totalPoints: seasonContributions.reduce((s, c) => s + c.pointsEarned, 0),
    seasonContributions,
    nonQualifyingSeasons,
    awardsProgress,
  });
}
