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

type LegacyActivityType = "gym" | "run" | "sport" | "mobility" | "other";

type AllowedActivityTypeLink = { activityCategoryId: string };

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

type PrevWeekRow = {
  weekStart: Date | string;
  weekCount: number | bigint;
  maxStartedAt: Date | null;
};

type EditExerciseInput = {
  exerciseId: string;
  sets: number | string;
  reps?: number | string | null;
  durationSeconds?: number | string | null;
  weightKg?: number | string | null;
};

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

function toDate(val: Date | string | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const s = String(val);
  return new Date(s.includes("T") ? s : s + "T00:00:00.000Z");
}

async function runScoringAsync(
  userId: string,
  seasonIds: string[],
  label: string,
  t0: number
) {
  if (seasonIds.length === 0) return;
  const tStart = Date.now();
  try {
    const seasons = await prisma.season.findMany({
      where: { id: { in: seasonIds } },
      select: { id: true, weeklyGoal: true },
    });
    for (const season of seasons) {
      await recalculateUserSeasonScoring({
        db: prisma,
        userId,
        seasonId: season.id,
        weeklyGoal: season.weeklyGoal,
        label,
      });
    }
    console.log(
      `[activity/${label}] async scoring done ${Date.now() - tStart}ms | wall ${Date.now() - t0}ms`
    );
  } catch (err) {
    console.error(`[activity/${label}] async scoring failed:`, err);
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const t0 = Date.now();

  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!id) return NextResponse.json({ error: "Missing activity id" }, { status: 400 });

    const activity = await prisma.activity.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        isDeleted: true,
        activitySeasons: { select: { seasonId: true } },
      },
    });

    if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    if (activity.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (activity.isDeleted) return NextResponse.json({ ok: true }, { status: 200 });

    const affectedSeasonIds = activity.activitySeasons.map(
      (as: { seasonId: string }) => as.seasonId
    );

    // Batch transaction: all five cleanup operations in one round-trip group.
    await prisma.$transaction([
      prisma.scoreEvent.deleteMany({ where: { activityId: id, userId: user.id } }),
      prisma.activitySeason.deleteMany({ where: { activityId: id } }),
      prisma.activityMedia.deleteMany({ where: { activityId: id } }),
      prisma.activityExercise.deleteMany({ where: { activityId: id } }),
      prisma.activity.update({ where: { id }, data: { isDeleted: true } }),
    ]);

    const tTx = Date.now();
    console.log(
      `[activity/delete] tx ${tTx - t0}ms — ${affectedSeasonIds.length} season(s) to recalc`
    );

    void runScoringAsync(user.id, affectedSeasonIds, "delete", t0);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("/api/activities/[id] DELETE error:", err);
    return NextResponse.json({ error: "Error deleting activity" }, { status: 500 });
  }
}

// ─── PUT (edit) ───────────────────────────────────────────────────────────────

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const t0 = Date.now();

  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!id) return NextResponse.json({ error: "Missing activity id" }, { status: 400 });

    const body = await req.json();
    const { startedAt, endedAt, activityCategoryId, notes, exercises } = body ?? {};

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
    const normalizedExercises: EditExerciseInput[] | undefined = Array.isArray(exercises)
      ? (exercises as EditExerciseInput[])
      : undefined;

    if (normalizedExercises) {
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
          return NextResponse.json(
            { error: "Each exercise must define reps or durationSeconds" },
            { status: 400 }
          );
        }
        if (reps !== null && durationSeconds !== null) {
          return NextResponse.json(
            { error: "Each exercise must define only reps or durationSeconds" },
            { status: 400 }
          );
        }
        if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0)) {
          return NextResponse.json({ error: "Invalid weightKg value" }, { status: 400 });
        }
      }
    }

    const existing = await prisma.activity.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        isDeleted: true,
        type: true,
        activitySeasons: { select: { seasonId: true } },
      },
    });

    if (!existing) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    if (existing.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (existing.isDeleted) return NextResponse.json({ error: "Activity is deleted" }, { status: 400 });

    const oldSeasonIds = existing.activitySeasons.map((as: { seasonId: string }) => as.seasonId);

    const result = await prisma.$transaction(
      async (tx: any) => {
        const activityCategory = await tx.activityCategory.findUnique({
          where: { id: activityCategoryId },
          select: { id: true, slug: true, name: true },
        });
        if (!activityCategory) {
          throw new Error("Invalid activity category");
        }

        const normalizedType = mapCategorySlugToLegacyType(activityCategory.slug);
        const weekStart = startOfWeekMonday(s);

        // Remove old scoring artifacts
        await tx.scoreEvent.deleteMany({ where: { activityId: id } });
        await tx.activitySeason.deleteMany({ where: { activityId: id } });

        // Replace exercises if provided
        if (normalizedExercises !== undefined) {
          await tx.activityExercise.deleteMany({ where: { activityId: id } });
          if (normalizedExercises.length > 0) {
            const exerciseIds = [...new Set(normalizedExercises.map((ex) => ex.exerciseId))];
            const dbExercises: Array<{ id: string; measureType: string }> =
              await tx.exercise.findMany({
                where: { id: { in: exerciseIds } },
                select: { id: true, measureType: true },
              });
            if (dbExercises.length !== exerciseIds.length) {
              throw new Error("One or more exercises do not exist");
            }
            const exerciseById = new Map(dbExercises.map((ex) => [ex.id, ex]));
            await tx.activityExercise.createMany({
              data: normalizedExercises.map((item) => {
                const ex = exerciseById.get(item.exerciseId)!;
                return {
                  activityId: id,
                  exerciseId: item.exerciseId,
                  sets: Number(item.sets),
                  reps: ex.measureType === "reps" ? parseNullableNumber(item.reps) : null,
                  durationSeconds:
                    ex.measureType === "duration" ? parseNullableNumber(item.durationSeconds) : null,
                  weightKg: parseNullableNumber(item.weightKg),
                };
              }),
            });
          }
        }

        await tx.activity.update({
          where: { id },
          data: {
            startedAt: s,
            endedAt: e,
            durationMinutes,
            type: normalizedType,
            activityCategoryId: activityCategory.id,
            notes: typeof notes === "string" && notes.trim().length > 0 ? notes.trim() : null,
          },
        });

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
        const newSeasonIds: string[] = [];

        for (const season of candidateSeasons) {
          const allowedCategoryIds = normalizeAllowedActivityCategoryIds(season.allowedActivityTypeLinks);
          if (allowedCategoryIds.length > 0 && !allowedCategoryIds.includes(activityCategory.id)) {
            continue;
          }

          // Raw SQL JOIN — same pattern as create route
          const prevRowsRaw: PrevWeekRow[] = await tx.$queryRaw`
            SELECT
              DATE_SUB(DATE(a.startedAt),
                INTERVAL ((DAYOFWEEK(a.startedAt) - 2 + 7) % 7) DAY) AS weekStart,
              COUNT(*)         AS weekCount,
              MAX(a.startedAt) AS maxStartedAt
            FROM activityseason acs
            JOIN activity a ON acs.activityId = a.id
            WHERE acs.seasonId = ${season.id}
              AND a.userId    = ${user.id}
              AND a.isDeleted = 0
              AND a.startedAt < ${s}
              AND a.id != ${id}
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
              if (d && (!lastPrevDate || d.getTime() > lastPrevDate.getTime())) lastPrevDate = d;
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
            activity: { id, type: normalizedType, startedAt: s, endedAt: e, durationMinutes },
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

          await tx.activitySeason.create({ data: { activityId: id, seasonId: season.id } });
          await tx.scoreEvent.create({
            data: {
              seasonId: season.id,
              userId: user.id,
              activityId: id,
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

          newSeasonIds.push(season.id);
        }

        return { oldSeasonIds, newSeasonIds };
      },
      { timeout: 15000, maxWait: 5000 }
    );

    const tTx = Date.now();
    const allAffectedSeasonIds = [...new Set([...result.oldSeasonIds, ...result.newSeasonIds])];
    console.log(
      `[activity/edit] tx ${tTx - t0}ms — ${allAffectedSeasonIds.length} season(s) to recalc`
    );

    void runScoringAsync(user.id, allAffectedSeasonIds, "edit", t0);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("/api/activities/[id] PUT error:", err);
    return NextResponse.json({ error: "Error updating activity" }, { status: 500 });
  }
}
