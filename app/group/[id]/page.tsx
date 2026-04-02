import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/currentUser";
import { prisma } from "@/src/lib/db";
import GroupPageClient from "./GroupPageClient";
import { getSeasonLeaderboard } from "@/src/lib/scoring/getSeasonLeaderboard";
import { getUserSeasonStanding } from "@/src/lib/scoring/getUserSeasonStanding";
import { finalizeSeasonIfNeeded } from "@/src/lib/scoring/finalizeSeasonIfNeeded";

type ActivityMuscleItem = {
  name: string;
  percentage: number;
};

function roundTo(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function calculateActivityMuscleShare(
  exercises: Array<{
    sets: number;
    reps: number;
    weightKg?: number | null;
    exercise: {
      muscles: Array<{
        percentage: number;
        muscle: {
          name: string;
        };
      }>;
    };
  }>
): ActivityMuscleItem[] {
  const muscleLoadMap = new Map<string, number>();

  for (const entry of exercises) {
    const sets = Number(entry.sets) || 0;
    const reps = Number(entry.reps) || 0;
    const weightKg = Number(entry.weightKg) || 0;

    const baseLoad = weightKg > 0 ? sets * reps * weightKg : sets * reps;
    if (baseLoad <= 0) continue;

    const muscles = entry.exercise?.muscles ?? [];
    if (muscles.length === 0) continue;

    const totalPct = muscles.reduce((sum, item) => sum + item.percentage, 0);
    if (totalPct <= 0) continue;

    for (const muscleEntry of muscles) {
      const normalized = muscleEntry.percentage / totalPct;
      const contributed = baseLoad * normalized;
      const key = muscleEntry.muscle.name;

      muscleLoadMap.set(key, (muscleLoadMap.get(key) ?? 0) + contributed);
    }
  }

  const totalLoad = Array.from(muscleLoadMap.values()).reduce((a, b) => a + b, 0);
  if (totalLoad <= 0) return [];

  return Array.from(muscleLoadMap.entries())
    .map(([name, load]) => ({
      name,
      percentage: roundTo((load / totalLoad) * 100, 1),
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 4);
}

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

function getWeekKey(date: Date) {
  const weekStart = getWeekStart(date);
  const year = weekStart.getFullYear();
  const month = String(weekStart.getMonth() + 1).padStart(2, "0");
  const day = String(weekStart.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPreviousWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 7);
  return d;
}

function getCurrentConsecutiveWeekStreak(
  weekCounts: Map<string, number>,
  predicate: (count: number) => boolean
) {
  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  const currentWeekCount = weekCounts.get(getWeekKey(currentWeekStart)) ?? 0;

  let cursor = predicate(currentWeekCount)
    ? currentWeekStart
    : getPreviousWeek(currentWeekStart);

  let streak = 0;

  while (true) {
    const key = getWeekKey(cursor);
    const count = weekCounts.get(key) ?? 0;

    if (!predicate(count)) break;

    streak += 1;
    cursor = getPreviousWeek(cursor);
  }

  return streak;
}

function normalizeAllowedActivityTypes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function computeSeasonMemberStats(
  activities: Array<{ startedAt: Date }>,
  weeklyGoal: number
) {
  const weekCounts = new Map<string, number>();

  for (const activity of activities) {
    const weekKey = getWeekKey(activity.startedAt);
    weekCounts.set(weekKey, (weekCounts.get(weekKey) ?? 0) + 1);
  }

  const currentWeekCount = weekCounts.get(getWeekKey(new Date())) ?? 0;

  const activeWeeks = getCurrentConsecutiveWeekStreak(
    weekCounts,
    (count) => count >= 1
  );

  const perfectWeeks = getCurrentConsecutiveWeekStreak(
    weekCounts,
    (count) => count >= weeklyGoal
  );

  return {
    currentWeekCount,
    activeWeeks,
    perfectWeeks,
  };
}

export default async function GroupByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: groupId } = await params;
  if (!groupId) redirect("/home");

  const membership = await prisma.groupMember.findFirst({
    where: {
      userId: user.id,
      groupId,
      leftAt: null,
    },
    include: {
      group: true,
    },
  });

  if (!membership?.group) redirect("/home");

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        where: { leftAt: null },
        select: {
          id: true,
          userId: true,
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              photoUrl: true,
            },
          },
        },
      },
      seasons: {
        orderBy: { startDate: "desc" },
        include: {
          members: {
            where: { leftAt: null },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  photoUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!group) redirect("/home");

const isAdmin = membership.role === "admin";
const now = new Date();

// Auto-finalizar temporadas activas cuyo endDate ya pasó
const seasonsToAutoFinalize = group.seasons.filter(
  (season) =>
    season.isActive &&
    !season.endedAt &&
    new Date(season.endDate).getTime() <= now.getTime()
);

if (seasonsToAutoFinalize.length > 0) {
  for (const season of seasonsToAutoFinalize) {
    await finalizeSeasonIfNeeded(season.id);
  }
}

const freshGroup =
  seasonsToAutoFinalize.length > 0
    ? await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          members: {
            where: { leftAt: null },
            select: {
              id: true,
              userId: true,
              role: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  photoUrl: true,
                },
              },
            },
          },
          seasons: {
            orderBy: { startDate: "desc" },
            include: {
              members: {
                where: { leftAt: null },
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      photoUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
    : group;

if (!freshGroup) redirect("/home");

const activeSeason =
  freshGroup.seasons.find(
    (season) =>
      season.isActive &&
      !season.endedAt &&
      new Date(season.startDate).getTime() <= now.getTime() &&
      new Date(season.endDate).getTime() >= now.getTime()
  ) ?? null;

const userJoinedActiveSeason = activeSeason
  ? activeSeason.members.some((member) => member.userId === user.id)
  : false;

const seasonLeaderboard =
  activeSeason && userJoinedActiveSeason
    ? await getSeasonLeaderboard(activeSeason.id)
    : [];

const userSeasonStanding =
  activeSeason && userJoinedActiveSeason
    ? await getUserSeasonStanding(activeSeason.id, user.id)
    : null;

const upcomingSeason =
  freshGroup.seasons.find(
    (season) => new Date(season.startDate).getTime() > now.getTime()
  ) ?? null;

const pastSeasons = freshGroup.seasons.filter(
  (season) =>
    !season.isActive ||
    !!season.endedAt ||
    new Date(season.endDate).getTime() < now.getTime()
);

  const memberIds = freshGroup.members.map((member) => member.userId);

const activities = await prisma.activity.findMany({
  where: {
    userId: { in: memberIds },
    isDeleted: false,
  },
  orderBy: { startedAt: "desc" },
  take: 100,
  include: {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
      },
    },
    media: {
      select: {
        id: true,
        url: true,
      },
      take: 1,
    },
    exercises: {
      select: {
        id: true,
        sets: true,
        reps: true,
        weightKg: true,
        exercise: {
          select: {
            id: true,
            name: true,
            muscles: {
              select: {
                percentage: true,
                muscle: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

  const activeSeasonAllowedTypes = activeSeason
    ? normalizeAllowedActivityTypes(activeSeason.allowedActivityTypes)
    : [];

  const seasonScopedActivities = activeSeason
    ? activities.filter((activity) => {
        const startedAt = new Date(activity.startedAt);
        const matchesDate =
          startedAt >= new Date(activeSeason.startDate) &&
          startedAt <= new Date(activeSeason.endDate);

        const matchesType =
          activeSeasonAllowedTypes.length === 0 ||
          activeSeasonAllowedTypes.includes(activity.type);

        return matchesDate && matchesType;
      })
    : [];

  const earnedAwards = activeSeason
    ? await prisma.awardEarned.findMany({
        where: {
          seasonId: activeSeason.id,
          userId: { in: memberIds },
        },
        orderBy: {
          earnedAt: "desc",
        },
        include: {
          award: {
            select: {
              id: true,
              name: true,
              level: true,
              category: true,
            },
          },
        },
      })
    : [];

  const awardsByUser = new Map<
    string,
    Array<{
      id: string;
      name: string;
      level: number | null;
      category: string | null;
    }>
  >();

  for (const earned of earnedAwards) {
    const current = awardsByUser.get(earned.userId) ?? [];

    if (!current.some((item) => item.id === earned.award.id)) {
      current.push({
        id: earned.award.id,
        name: earned.award.name,
        level: earned.award.level,
        category: earned.award.category,
      });
    }

    awardsByUser.set(earned.userId, current);
  }

  const membersWithStats = freshGroup.members
    .map((member) => {
      const memberActivities = seasonScopedActivities.filter(
        (activity) => activity.userId === member.userId
      );

      const stats = computeSeasonMemberStats(
        memberActivities.map((activity) => ({ startedAt: activity.startedAt })),
        activeSeason?.weeklyGoal ?? 2
      );

      const badges = (awardsByUser.get(member.userId) ?? []).slice(0, 3);

      return {
        id: member.user.id,
        userId: member.userId,
        name: member.user.name,
        email: member.user.email,
        photoUrl: member.user.photoUrl,
        role: member.role,
        currentWeekCount: stats.currentWeekCount,
        activeWeeks: stats.activeWeeks,
        perfectWeeks: stats.perfectWeeks,
        badges,
      };
    })
    .sort((a, b) => {
      return (
        b.perfectWeeks - a.perfectWeeks ||
        b.activeWeeks - a.activeWeeks ||
        b.currentWeekCount - a.currentWeekCount
      );
    });

  const seasons = freshGroup.seasons.map((season) => {
    const joined = season.members.some((member) => member.userId === user.id);
    const allowedTypes = normalizeAllowedActivityTypes(season.allowedActivityTypes);

    return {
      id: season.id,
      name: season.name,
      description: season.description,
      startDate: season.startDate,
      endDate: season.endDate,
      weeklyGoal: season.weeklyGoal,
      allowedActivityTypes: allowedTypes,
      members: season.members.map((member) => ({
        id: member.user.id,
        userId: member.userId,
        name: member.user.name,
        email: member.user.email,
        photoUrl: member.user.photoUrl,
      })),
      joined,
      isActive:
        new Date(season.startDate) <= now && new Date(season.endDate) >= now,
      isUpcoming: new Date(season.startDate) > now,
      isPast: new Date(season.endDate) < now,
    };
  });

  const actData = seasonScopedActivities.map((activity) => ({
  id: activity.id,
  type: activity.type,
  notes: activity.notes,
  startedAt: activity.startedAt,
  endedAt: activity.endedAt,
  durationMinutes: activity.durationMinutes,
  mediaUrl: activity.media?.[0]?.url ?? null,
  user: activity.user,
  muscles: calculateActivityMuscleShare(activity.exercises),
}));

  return (
    <GroupPageClient
      group={freshGroup}
      isAdmin={isAdmin}
      activities={actData}
      membersWithStats={membersWithStats}
      activeSeason={activeSeason}
      upcomingSeason={upcomingSeason}
      pastSeasons={pastSeasons}
      seasons={seasons}
      currentUserId={user.id}
      seasonLeaderboard={seasonLeaderboard}
      userSeasonStanding={userSeasonStanding}
    />
  );
}