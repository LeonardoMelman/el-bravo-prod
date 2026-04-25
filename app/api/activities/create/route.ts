import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/currentUser";
import { prisma } from "@/src/lib/db";
import {
  diffInFullDays,
  getCurrentConsecutiveWeekStreak,
  startOfWeekMonday,
} from "@/src/lib/scoring/weekUtils";
import { calculateActivityScore } from "@/src/lib/scoring/calculateActivityScore";
import { recalculateUserSeasonScoring } from "@/src/lib/scoring/recalculateUserSeasonScoring";
import { evaluateAndSyncAwards } from "@/src/lib/awards/evaluateAndSyncAwards";

type LegacyActivityType = "gym" | "run" | "sport" | "mobility" | "other";

type CreateActivityExerciseInput = {
  exerciseId: string;
  sets: number | string;
  reps?: number | string | null;
  durationSeconds?: number | string | null;
  weightKg?: number | string | null;
};

type ExistingExerciseEntry = {
  id: string;
  measureType: "reps" | "duration";
};

type AllowedActivityTypeLink = {
  activityCategoryId: string;
};

// Raw SQL row returned for previous-activity week counts inside the tx.
type PrevWeekRow = {
  weekStart: Date | string;
  weekCount: number | bigint;
  maxStartedAt: Date | null;
};

type CandidateSeasonEntry = {
  id: string;
  weeklyGoal: number;
  basePointsPerActivity: number;
  weeklyStreakBonus: number;
  perfectWeekBonus: number;
  minDuration: number | null;
  allowedActivityTypeLinks: AllowedActivityTypeLink[];
  maxScoreableMinutesPerActivity: number | null;
};

type CreatedScoreEventEntry = {
  seasonId: string;
  points: number;
};

class ActivityCreateHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function mapCategorySlugToLegacyType(slug: string): LegacyActivityType {
  switch (slug) {
    case "strength":
    case "calisthenics":
      return "gym";
    case "running":
    case "trail_running":
      return "run";
    case "yoga_pilates":
      return "mobility";
    case "cycling":
    case "indoor_cycling":
    case "swimming":
    case "walking_trekking":
    case "hiit_functional":
    case "rowing":
    case "climbing":
    case "martial_arts":
    case "dance":
    case "elliptical":
    case "ski_snowboard":
    case "water_sports":
    case "crossfit":
    case "skating":
      return "sport";
    default:
      return "other";
  }
}

function normalizeAllowedActivityCategoryIds(links: AllowedActivityTypeLink[]): string[] {
  const ids = new Set<string>();
  for (const link of links) ids.add(link.activityCategoryId);
  return Array.from(ids);
}

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

// Convert DATE/DATETIME raw SQL result to a JS Date safely.
function toDate(val: Date | string | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const s = String(val);
  return new Date(s.includes("T") ? s : s + "T00:00:00.000Z");
}

export async function POST(req: Request) {
  const t0 = Date.now();

  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { startedAt, endedAt, notes, activityCategoryId, routineId, exercises = [] } = body ?? {};

    if (!startedAt || !endedAt) {
      return NextResponse.json({ error: "Start and end required" }, { status: 400 });
    }
    if (!activityCategoryId || typeof activityCategoryId !== "string") {
      return NextResponse.json({ error: "Missing activityCategoryId" }, { status: 400 });
    }

    const s = new Date(startedAt);
    const e = new Date(endedAt);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s >= e) {
      return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
    }

    const durationMinutes = Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60)));
    const normalizedExercises = exercises as CreateActivityExerciseInput[];

    for (const item of normalizedExercises) {
      if (!item?.exerciseId || typeof item.exerciseId !== "string") {
        return NextResponse.json({ error: "Invalid exerciseId" }, { status: 400 });
      }
      const sets = Number(item.sets);
      const reps = parseNullableNumber(item.reps);
      const durationSeconds = parseNullableNumber(item.durationSeconds);
      const weightKg = parseNullableNumber(item.weightKg);

      if (!Number.isFinite(sets) || sets <= 0) {
        return NextResponse.json({ error: "Invalid sets value" }, { status: 400 });
      }
      if (reps !== null && (!Number.isFinite(reps) || reps <= 0)) {
        return NextResponse.json({ error: "Invalid reps value" }, { status: 400 });
      }
      if (durationSeconds !== null && (!Number.isFinite(durationSeconds) || durationSeconds <= 0)) {
        return NextResponse.json({ error: "Invalid durationSeconds value" }, { status: 400 });
      }
      if (reps === null && durationSeconds === null) {
        return NextResponse.json({ error: "Each exercise must define reps or durationSeconds" }, { status: 400 });
      }
      if (reps !== null && durationSeconds !== null) {
        return NextResponse.json({ error: "Each exercise must define only reps or durationSeconds" }, { status: 400 });
      }
      if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0)) {
        return NextResponse.json({ error: "Invalid weightKg value" }, { status: 400 });
      }
    }

    // ── Short write transaction ──────────────────────────────────────────────
    // Creates the activity record, exercises, season links, and base score
    // events. Scoring recalculation (week progress + bonus events) is done
    // asynchronously after the response so it does NOT block the user.
    const result = await prisma.$transaction(
      async (tx: any) => {
        const activityCategory = await tx.activityCategory.findUnique({
          where: { id: activityCategoryId },
          select: { id: true, slug: true, name: true },
        });
        if (!activityCategory) {
          throw new ActivityCreateHttpError(400, "Invalid activity category");
        }

        const normalizedType = mapCategorySlugToLegacyType(activityCategory.slug);
        const weekStart = startOfWeekMonday(s);

        const activity = await tx.activity.create({
          data: {
            userId: user.id,
            startedAt: s,
            endedAt: e,
            durationMinutes,
            notes: typeof notes === "string" && notes.trim().length > 0 ? notes.trim() : null,
            type: normalizedType,
            activityCategoryId: activityCategory.id,
            routineId: typeof routineId === "string" && routineId.trim().length > 0 ? routineId.trim() : null,
          },
        });

        const exerciseIdsSet = new Set<string>();
        for (const item of normalizedExercises) exerciseIdsSet.add(item.exerciseId);
        const exerciseIds = Array.from(exerciseIdsSet);

        const existingExercisesRaw = await tx.exercise.findMany({
          where: { id: { in: exerciseIds } },
          select: { id: true, measureType: true },
        });
        const existingExercises = existingExercisesRaw as ExistingExerciseEntry[];

        if (existingExercises.length !== exerciseIds.length) {
          throw new ActivityCreateHttpError(400, "One or more exercises do not exist");
        }

        const exerciseById = new Map<string, ExistingExerciseEntry>();
        for (const ex of existingExercises) exerciseById.set(ex.id, ex);

        const activityExercisesData = normalizedExercises.map((item) => {
          const ex = exerciseById.get(item.exerciseId)!;
          return {
            activityId: activity.id,
            exerciseId: item.exerciseId,
            sets: Number(item.sets),
            reps: ex.measureType === "reps" ? parseNullableNumber(item.reps) : null,
            durationSeconds: ex.measureType === "duration" ? parseNullableNumber(item.durationSeconds) : null,
            weightKg: parseNullableNumber(item.weightKg),
          };
        });

        if (activityExercisesData.length > 0) {
          await tx.activityExercise.createMany({ data: activityExercisesData });
        }

        const candidateSeasonsRaw = await tx.season.findMany({
          where: {
            isActive: true,
            startDate: { lte: s },
            endDate: { gte: s },
            members: { some: { userId: user.id, leftAt: null } },
          },
          select: {
            id: true,
            weeklyGoal: true,
            basePointsPerActivity: true,
            weeklyStreakBonus: true,
            perfectWeekBonus: true,
            minDuration: true,
            allowedActivityTypeLinks: { select: { activityCategoryId: true } },
            maxScoreableMinutesPerActivity: true,
          },
        });

        const candidateSeasons = candidateSeasonsRaw as CandidateSeasonEntry[];
        const createdScoreEvents: CreatedScoreEventEntry[] = [];
        const seasonsForRecalc: Array<{ seasonId: string; weeklyGoal: number }> = [];

        for (const season of candidateSeasons) {
          const allowedCategoryIds = normalizeAllowedActivityCategoryIds(season.allowedActivityTypeLinks);
          if (allowedCategoryIds.length > 0 && !allowedCategoryIds.includes(activityCategory.id)) {
            continue;
          }

          // ── Raw SQL replaces N+1 Prisma nested-relation query ─────────────
          // Old: activitySeason.findMany({ activity: { ...filter } }) → 1+N queries
          // New: JOIN query → 1 query. Also computes MAX(startedAt) for comeback
          //      bonus, eliminating the separate activity.findFirst query.
          const prevRowsRaw: PrevWeekRow[] = await tx.$queryRaw`
            SELECT
              DATE_SUB(DATE(a.startedAt),
                INTERVAL ((DAYOFWEEK(a.startedAt) - 2 + 7) % 7) DAY) AS weekStart,
              COUNT(*)           AS weekCount,
              MAX(a.startedAt)   AS maxStartedAt
            FROM activityseason acs
            JOIN activity a ON acs.activityId = a.id
            WHERE acs.seasonId = ${season.id}
              AND a.userId    = ${user.id}
              AND a.isDeleted = 0
              AND a.startedAt < ${s}
            GROUP BY weekStart
            ORDER BY weekStart ASC
          `;

          const previousWeekCounts = new Map<string, number>();
          let lastPrevDate: Date | null = null;

          for (const row of prevRowsRaw) {
            const ws = toDate(row.weekStart);
            if (ws) previousWeekCounts.set(ws.toISOString().slice(0, 10), Number(row.weekCount));
            if (row.maxStartedAt) {
              const d = toDate(row.maxStartedAt);
              if (d && (!lastPrevDate || d.getTime() > lastPrevDate.getTime())) {
                lastPrevDate = d;
              }
            }
          }

          const currentActiveWeekStreak = getCurrentConsecutiveWeekStreak(
            previousWeekCounts,
            (count) => count >= 1,
            s
          );
          const currentPerfectWeekStreak = getCurrentConsecutiveWeekStreak(
            previousWeekCounts,
            (count) => count >= season.weeklyGoal,
            s
          );
          const daysSincePreviousActivity = lastPrevDate ? diffInFullDays(s, lastPrevDate) : null;

          const score = calculateActivityScore({
            activity: { id: activity.id, type: normalizedType, startedAt: s, endedAt: e, durationMinutes },
            season: {
              id: season.id,
              weeklyGoal: season.weeklyGoal,
              basePointsPerActivity: season.basePointsPerActivity,
              allowedActivityTypes: [activityCategory.slug],
              maxScoreableMinutesPerActivity: season.maxScoreableMinutesPerActivity,
              minDuration: season.minDuration,
            },
            currentActiveWeekStreak,
            currentPerfectWeekStreak,
            daysSincePreviousActivity,
          });

          if (!score.eligible || score.totalPoints <= 0) continue;

          await tx.activitySeason.create({ data: { activityId: activity.id, seasonId: season.id } });

          await tx.scoreEvent.create({
            data: {
              seasonId: season.id,
              userId: user.id,
              activityId: activity.id,
              weekStart,
              type: "activity_base",
              points: score.totalPoints,
              reason: "Scoring base por actividad",
              metadata: {
                ...score.metadata,
                activityCategoryId: activityCategory.id,
                activityCategorySlug: activityCategory.slug,
                activityCategoryName: activityCategory.name,
              },
            },
          });

          createdScoreEvents.push({ seasonId: season.id, points: score.totalPoints });
          seasonsForRecalc.push({ seasonId: season.id, weeklyGoal: season.weeklyGoal });
        }

        return { activityId: activity.id, createdScoreEvents, seasonsForRecalc };
      },
      { timeout: 15000, maxWait: 5000 }
    );

    const tTx = Date.now();
    console.log(
      `[activity/create] tx ${tTx - t0}ms — ${result.seasonsForRecalc.length} season(s) to recalc`
    );

    // ── Fire-and-forget recalculation ────────────────────────────────────────
    // Respond immediately. Scoring runs in the background in the same Node.js
    // process. Safe for long-lived servers (next start). For Vercel/serverless
    // use waitUntil from @vercel/functions instead.
    void runScoringAsync(user.id, result.seasonsForRecalc, result.activityId, t0);

    return NextResponse.json(
      { ok: true, activityId: result.activityId, createdScoreEvents: result.createdScoreEvents },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ActivityCreateHttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("/api/activities/create error:", err);
    return NextResponse.json({ error: "Error creating activity" }, { status: 500 });
  }
}

async function runScoringAsync(
  userId: string,
  seasons: Array<{ seasonId: string; weeklyGoal: number }>,
  activityId: string,
  t0: number
) {
  const tStart = Date.now();
  try {
    for (const season of seasons) {
      await recalculateUserSeasonScoring({
        db: prisma,
        userId,
        seasonId: season.seasonId,
        weeklyGoal: season.weeklyGoal,
        label: "create",
      });
    }
    await evaluateAndSyncAwards(userId, activityId);
    console.log(`[activity/create] async scoring done ${Date.now() - tStart}ms | wall ${Date.now() - t0}ms`);
  } catch (err) {
    console.error("[activity/create] async scoring failed:", err);
  }
}
