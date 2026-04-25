// Unified season scoring recalculation.
//
// WHY: The old Prisma nested-relation queries (activitySeason.findMany with
// `activity: { ... }` filter) triggered N+1 round trips — one SELECT per
// linked activity. With 12 activities that's 13 queries at ~150ms each = 1.9s
// just for this step, repeated twice (once in create-tx, once post-tx).
//
// This module replaces all of that with two parallel raw-SQL queries, two
// parallel deletes, and two parallel inserts — three round-trip groups total,
// regardless of season length.

import { addDays } from "./weekUtils";

const PERFECT_WEEK_BONUS = 0;

function getWeeklyStreakBonusPoints(streakCount: number): number {
  //if (streakCount >= 6) return 150;
  //if (streakCount >= 4) return 100;
  //if (streakCount >= 2) return 50;
  return 0;
}

// MariaDB may return DATE columns as strings or Date objects depending on the
// adapter version and session config. Handle both.
function toDate(val: Date | string | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const s = String(val);
  return new Date(s.includes("T") ? s : s + "T00:00:00.000Z");
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type WeekActivityRow = {
  weekStart: Date | string;
  activitiesCount: number | bigint;
  minutesTotal: number | bigint;
};

type WeekPointsRow = {
  weekStart: Date | string;
  nonBonusPoints: number | bigint;
};

export async function recalculateUserSeasonScoring({
  db,
  userId,
  seasonId,
  weeklyGoal,
  label = "",
}: {
  db: any;
  userId: string;
  seasonId: string;
  weeklyGoal: number;
  label?: string;
}) {
  const tag = `[scoring${label ? ":" + label : ""}]`;
  const t0 = Date.now();

  // ── Round-trip 1: two queries in parallel ─────────────────────────────────
  //
  // Q1: activity counts per week — single JOIN instead of N+1 Prisma nested
  //     relation query.  The DAYOFWEEK formula rolls back to Monday (Sun=1,
  //     Mon=2, … Sat=7) so (DAYOFWEEK-2+7)%7 gives days-to-subtract.
  //
  // Q2: existing non-bonus score points per week — used to compute
  //     pointsEarned without an extra groupBy after inserting bonuses.

  const [weekRowsRaw, pointsRowsRaw] = await Promise.all([
    db.$queryRaw`
      SELECT
        DATE_SUB(DATE(a.startedAt),
          INTERVAL ((DAYOFWEEK(a.startedAt) - 2 + 7) % 7) DAY) AS weekStart,
        COUNT(*)                                                 AS activitiesCount,
        COALESCE(SUM(a.durationMinutes), 0)                     AS minutesTotal
      FROM activityseason acs
      JOIN activity a ON acs.activityId = a.id
      WHERE acs.seasonId = ${seasonId}
        AND a.userId    = ${userId}
        AND a.isDeleted = 0
      GROUP BY weekStart
      ORDER BY weekStart ASC
    ` as Promise<WeekActivityRow[]>,

    db.$queryRaw`
      SELECT
        weekStart,
        SUM(points) AS nonBonusPoints
      FROM scoreevent
      WHERE seasonId = ${seasonId}
        AND userId   = ${userId}
        AND type NOT IN ('weekly_streak_bonus', 'perfect_week_bonus')
        AND weekStart IS NOT NULL
      GROUP BY weekStart
    ` as Promise<WeekPointsRow[]>,
  ]);

  console.log(
    `${tag} fetch ${Date.now() - t0}ms — ${weekRowsRaw.length} week(s)`
  );
  const t1 = Date.now();

  // ── In-memory computation ─────────────────────────────────────────────────

  const nonBonusMap = new Map<string, number>();
  for (const row of pointsRowsRaw) {
    const d = toDate(row.weekStart);
    if (d) nonBonusMap.set(isoDay(d), Number(row.nonBonusPoints ?? 0));
  }

  const progressRows: Array<{
    seasonId: string;
    userId: string;
    weekStart: Date;
    activitiesCount: number;
    minutesTotal: number;
    goalTarget: number;
    goalReached: boolean;
    perfectWeek: boolean;
    streakCount: number;
    pointsEarned: number;
  }> = [];

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

  let prevWeekStart: Date | null = null;
  let prevStreak = 0;

  for (const row of weekRowsRaw) {
    const ws = toDate(row.weekStart);
    if (!ws) continue;

    const activitiesCount = Number(row.activitiesCount);
    const minutesTotal = Number(row.minutesTotal);
    const goalReached = activitiesCount >= weeklyGoal;
    const perfectWeek = goalReached;

    let streakCount = 0;
    if (goalReached) {
      if (prevWeekStart && isoDay(prevWeekStart) === isoDay(addDays(ws, -7))) {
        streakCount = prevStreak + 1;
      } else {
        streakCount = 1;
      }
    }

    let bonusThisWeek = 0;

    if (goalReached) {
      const streakBonus = getWeeklyStreakBonusPoints(streakCount);
      if (streakBonus > 0) {
        bonusEvents.push({
          seasonId,
          userId,
          activityId: null,
          weekStart: ws,
          type: "weekly_streak_bonus",
          points: streakBonus,
          reason: `Bonus por racha activa de ${streakCount} semanas`,
          metadata: { streakCount },
        });
        bonusThisWeek += streakBonus;
      }
    }

    if (perfectWeek) {
      bonusEvents.push({
        seasonId,
        userId,
        activityId: null,
        weekStart: ws,
        type: "perfect_week_bonus",
        points: PERFECT_WEEK_BONUS,
        reason: "Bonus por semana perfecta",
        metadata: { perfectWeek: true },
      });
      bonusThisWeek += PERFECT_WEEK_BONUS;
    }

    const baseThisWeek = nonBonusMap.get(isoDay(ws)) ?? 0;

    progressRows.push({
      seasonId,
      userId,
      weekStart: ws,
      activitiesCount,
      minutesTotal,
      goalTarget: weeklyGoal,
      goalReached,
      perfectWeek,
      streakCount,
      pointsEarned: baseThisWeek + bonusThisWeek,
    });

    prevWeekStart = ws;
    prevStreak = streakCount;
  }

  console.log(`${tag} compute ${Date.now() - t1}ms`);
  const t2 = Date.now();

  // ── Round-trip 2: two deletes in parallel ─────────────────────────────────
  await Promise.all([
    db.seasonWeekProgress.deleteMany({ where: { seasonId, userId } }),
    db.scoreEvent.deleteMany({
      where: {
        seasonId,
        userId,
        type: { in: ["weekly_streak_bonus", "perfect_week_bonus"] },
      },
    }),
  ]);

  console.log(`${tag} delete ${Date.now() - t2}ms`);
  const t3 = Date.now();

  // ── Round-trip 3: two inserts in parallel ─────────────────────────────────
  await Promise.all([
    progressRows.length > 0
      ? db.seasonWeekProgress.createMany({ data: progressRows })
      : Promise.resolve(),
    bonusEvents.length > 0
      ? db.scoreEvent.createMany({ data: bonusEvents })
      : Promise.resolve(),
  ]);

  console.log(
    `${tag} insert ${Date.now() - t3}ms | total ${Date.now() - t0}ms`
  );

  return progressRows;
}
