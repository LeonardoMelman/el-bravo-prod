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

import { Prisma } from "@prisma/client";
import { addDays } from "./weekUtils";

// MariaDB may return DATE columns as strings or Date objects depending on the
// adapter version and session config. Handle both.
function toDate(val: Date | string | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;

  const s = String(val);
  return new Date(s.includes("T") ? s : `${s}T00:00:00.000Z`);
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
  nonBonusPoints: number | bigint | null;
};

type RecalculateUserSeasonScoringParams = {
  db: Prisma.TransactionClient;
  userId: string;
  seasonId: string;
  weeklyGoal: number;
  label?: string;
};

export async function recalculateUserSeasonScoring({
  db,
  userId,
  seasonId,
  weeklyGoal,
  label = "",
}: RecalculateUserSeasonScoringParams) {
  const tag = `[scoring${label ? ":" + label : ""}]`;
  const t0 = Date.now();

  // ── Round-trip 1: two queries in parallel ─────────────────────────────────
  //
  // Q1: activity counts per week — single JOIN instead of N+1 Prisma nested
  //     relation query. The DAYOFWEEK formula rolls back to Monday (Sun=1,
  //     Mon=2, … Sat=7) so (DAYOFWEEK-2+7)%7 gives days-to-subtract.
  //
  // Q2: existing non-bonus score points per week — used to compute
  //     pointsEarned. Weekly/perfect bonus events are currently not generated
  //     here to avoid duplicated scoring with calculateActivityScore.

  const [weekRowsRaw, pointsRowsRaw] = await Promise.all([
    db.$queryRaw`
      SELECT
        DATE_SUB(DATE(a.startedAt),
          INTERVAL ((DAYOFWEEK(a.startedAt) - 2 + 7) % 7) DAY) AS weekStart,
        COUNT(*)                                                AS activitiesCount,
        COALESCE(SUM(a.durationMinutes), 0)                    AS minutesTotal
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
    if (d) {
      nonBonusMap.set(isoDay(d), Number(row.nonBonusPoints ?? 0));
    }
  }

  const progressRows: Prisma.SeasonWeekProgressCreateManyInput[] = [];

  let prevWeekStart: Date | null = null;
  let prevStreak = 0;

  for (const row of weekRowsRaw) {
    const weekStart = toDate(row.weekStart);
    if (!weekStart) continue;

    const activitiesCount = Number(row.activitiesCount);
    const minutesTotal = Number(row.minutesTotal);
    const goalReached = activitiesCount >= weeklyGoal;
    const perfectWeek = goalReached;

    let streakCount = 0;

    if (goalReached) {
      if (
        prevWeekStart &&
        isoDay(prevWeekStart) === isoDay(addDays(weekStart, -7))
      ) {
        streakCount = prevStreak + 1;
      } else {
        streakCount = 1;
      }
    }

    const pointsEarned = nonBonusMap.get(isoDay(weekStart)) ?? 0;

    progressRows.push({
      seasonId,
      userId,
      weekStart,
      activitiesCount,
      minutesTotal,
      goalTarget: weeklyGoal,
      goalReached,
      perfectWeek,
      streakCount,
      pointsEarned,
    });

    prevWeekStart = weekStart;
    prevStreak = streakCount;
  }

  console.log(`${tag} compute ${Date.now() - t1}ms`);

  const t2 = Date.now();

  // ── Round-trip 2: delete derived weekly data and old duplicated bonus events ──
  await Promise.all([
    db.seasonWeekProgress.deleteMany({
      where: { seasonId, userId },
    }),
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

  // ── Round-trip 3: insert recalculated weekly snapshots ─────────────────────
  if (progressRows.length > 0) {
    await db.seasonWeekProgress.createMany({
      data: progressRows,
    });
  }

  console.log(
    `${tag} insert ${Date.now() - t3}ms | total ${Date.now() - t0}ms`
  );

  return progressRows;
}
