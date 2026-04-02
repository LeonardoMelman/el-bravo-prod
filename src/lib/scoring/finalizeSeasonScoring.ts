import { getSeasonLeaderboard } from "@/src/lib/scoring/getSeasonLeaderboard";

const PERFECT_STREAK_FINAL_BONUS_TOTAL = 60;
const LONGEST_SESSION_FINAL_BONUS_TOTAL = 40;

type Params = {
  tx: any;
  seasonId: string;
};

type SeasonMemberRow = {
  userId: string;
};

type WeekProgressRow = {
  userId: string;
  streakCount: number;
  perfectWeek: boolean;
};

type ActivitySeasonRow = {
  activity: {
    id: string;
    userId: string;
    startedAt: Date;
    endedAt: Date;
    durationMinutes: number | null;
  };
};

function splitBonus(total: number, winnersCount: number) {
  if (winnersCount <= 0) return 0;
  return Math.round(total / winnersCount);
}

export async function finalizeSeasonScoring({ tx, seasonId }: Params) {
  const season = await tx.season.findUnique({
    where: { id: seasonId },
    select: {
      id: true,
      isActive: true,
      endDate: true,
      members: {
        where: { leftAt: null },
        select: {
          userId: true,
        },
      },
    },
  });

  if (!season) {
    throw new Error("Season not found");
  }

  const members = season.members as SeasonMemberRow[];
  const participantIds: string[] = [];

  for (const member of members) {
    participantIds.push(member.userId);
  }

  if (participantIds.length === 0) {
    await tx.season.update({
      where: { id: seasonId },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
    });

    return {
      finalized: true,
      leaderboard: [],
    };
  }

  await tx.scoreEvent.deleteMany({
    where: {
      seasonId,
      type: {
        in: [
          "final_longest_perfect_streak_bonus",
          "final_longest_session_bonus",
        ],
      },
    },
  });

  const weekProgressRaw = await tx.seasonWeekProgress.findMany({
    where: {
      seasonId,
      userId: { in: participantIds },
    },
    select: {
      userId: true,
      streakCount: true,
      perfectWeek: true,
    },
  });

  const weekProgress = weekProgressRaw as WeekProgressRow[];

  const activitiesRaw = await tx.activitySeason.findMany({
    where: {
      seasonId,
      activity: {
        userId: { in: participantIds },
        isDeleted: false,
      },
    },
    select: {
      activity: {
        select: {
          id: true,
          userId: true,
          startedAt: true,
          endedAt: true,
          durationMinutes: true,
        },
      },
    },
  });

  const activities = activitiesRaw as ActivitySeasonRow[];

  const longestPerfectStreakByUser = new Map<string, number>();
  for (const userId of participantIds) {
    longestPerfectStreakByUser.set(userId, 0);
  }

  for (const row of weekProgress) {
    if (!row.perfectWeek) continue;

    const current = longestPerfectStreakByUser.get(row.userId) ?? 0;
    longestPerfectStreakByUser.set(
      row.userId,
      Math.max(current, row.streakCount)
    );
  }

  const longestSessionByUser = new Map<string, number>();
  for (const userId of participantIds) {
    longestSessionByUser.set(userId, 0);
  }

  for (const row of activities) {
    const activity = row.activity;

    const duration =
      typeof activity.durationMinutes === "number" && activity.durationMinutes > 0
        ? activity.durationMinutes
        : Math.max(
            0,
            Math.round(
              (activity.endedAt.getTime() - activity.startedAt.getTime()) / (1000 * 60)
            )
          );

    const current = longestSessionByUser.get(activity.userId) ?? 0;
    longestSessionByUser.set(activity.userId, Math.max(current, duration));
  }

  const maxPerfectStreak = Math.max(
    ...Array.from(longestPerfectStreakByUser.values()),
    0
  );

  const maxSessionMinutes = Math.max(
    ...Array.from(longestSessionByUser.values()),
    0
  );

  const perfectStreakWinners: string[] = [];
  if (maxPerfectStreak > 0) {
    for (const userId of participantIds) {
      if ((longestPerfectStreakByUser.get(userId) ?? 0) === maxPerfectStreak) {
        perfectStreakWinners.push(userId);
      }
    }
  }

  const longestSessionWinners: string[] = [];
  if (maxSessionMinutes > 0) {
    for (const userId of participantIds) {
      if ((longestSessionByUser.get(userId) ?? 0) === maxSessionMinutes) {
        longestSessionWinners.push(userId);
      }
    }
  }

  const perfectStreakBonus = splitBonus(
    PERFECT_STREAK_FINAL_BONUS_TOTAL,
    perfectStreakWinners.length
  );

  const longestSessionBonus = splitBonus(
    LONGEST_SESSION_FINAL_BONUS_TOTAL,
    longestSessionWinners.length
  );

  for (const userId of perfectStreakWinners) {
    await tx.scoreEvent.create({
      data: {
        seasonId,
        userId,
        activityId: null,
        weekStart: null,
        type: "final_longest_perfect_streak_bonus",
        points: perfectStreakBonus,
        reason: `Bonus final por racha perfecta más larga (${maxPerfectStreak} semanas)`,
        metadata: {
          longestPerfectStreak: maxPerfectStreak,
          tiedWinners: perfectStreakWinners.length,
          bonusPool: PERFECT_STREAK_FINAL_BONUS_TOTAL,
        },
      },
    });
  }

  for (const userId of longestSessionWinners) {
    await tx.scoreEvent.create({
      data: {
        seasonId,
        userId,
        activityId: null,
        weekStart: null,
        type: "final_longest_session_bonus",
        points: longestSessionBonus,
        reason: `Bonus final por sesión más larga (${maxSessionMinutes} min)`,
        metadata: {
          longestSessionMinutes: maxSessionMinutes,
          tiedWinners: longestSessionWinners.length,
          bonusPool: LONGEST_SESSION_FINAL_BONUS_TOTAL,
        },
      },
    });
  }

  await tx.season.update({
    where: { id: seasonId },
    data: {
      isActive: false,
      endedAt: new Date(),
    },
  });

  const leaderboard = await getSeasonLeaderboard(seasonId, tx);

  return {
    finalized: true,
    leaderboard,
    summary: {
      perfectStreak: {
        maxPerfectStreak,
        winners: perfectStreakWinners,
        pointsEach: perfectStreakBonus,
      },
      longestSession: {
        maxSessionMinutes,
        winners: longestSessionWinners,
        pointsEach: longestSessionBonus,
      },
    },
  };
}