import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/currentUser";
import { prisma } from "@/src/lib/db";
import {
  buildWeekCounts,
  diffInFullDays,
  getCurrentConsecutiveWeekStreak,
  startOfWeekMonday,
} from "@/src/lib/scoring/weekUtils";
import { calculateActivityScore } from "@/src/lib/scoring/calculateActivityScore";
import { recalculateSeasonWeekProgress } from "@/src/lib/scoring/recalculateSeasonWeekProgress";
import { applyWeeklyBonuses } from "@/src/lib/scoring/applyWeeklyBonuses";

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

type PreviousLinkedActivityEntry = {
  activity: {
    startedAt: Date;
  };
};

type CandidateSeasonEntry = {
  id: string;
  weeklyGoal: number;
  basePointsPerActivity: number;
  weeklyStreakBonus: number;
  perfectWeekBonus: number;
  allowedActivityTypeLinks: AllowedActivityTypeLink[];
  maxScoreableMinutesPerActivity: number | null;
};

type CreatedScoreEventEntry = {
  seasonId: string;
  points: number;
};

type SeasonPostProcessingEntry = {
  seasonId: string;
  weeklyGoal: number;
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

function normalizeAllowedActivityCategoryIds(
  links: AllowedActivityTypeLink[]
): string[] {
  const ids = new Set<string>();

  for (const link of links) {
    ids.add(link.activityCategoryId);
  }

  return Array.from(ids);
}

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const {
      startedAt,
      endedAt,
      notes,
      activityCategoryId,
      routineId,
      exercises = [],
    } = body ?? {};

    if (!startedAt || !endedAt) {
      return NextResponse.json(
        { error: "Start and end required" },
        { status: 400 }
      );
    }

    if (!activityCategoryId || typeof activityCategoryId !== "string") {
      return NextResponse.json(
        { error: "Missing activityCategoryId" },
        { status: 400 }
      );
    }

    const s = new Date(startedAt);
    const e = new Date(endedAt);

    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s >= e) {
      return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
    }

    const durationMinutes = Math.max(
      0,
      Math.round((e.getTime() - s.getTime()) / (1000 * 60))
    );

    const normalizedExercises = exercises as CreateActivityExerciseInput[];

    for (const item of normalizedExercises) {
      if (!item?.exerciseId || typeof item.exerciseId !== "string") {
        return NextResponse.json(
          { error: "Invalid exerciseId" },
          { status: 400 }
        );
      }

      const sets = Number(item.sets);
      const reps = parseNullableNumber(item.reps);
      const durationSeconds = parseNullableNumber(item.durationSeconds);
      const weightKg = parseNullableNumber(item.weightKg);

      if (!Number.isFinite(sets) || sets <= 0) {
        return NextResponse.json(
          { error: "Invalid sets value" },
          { status: 400 }
        );
      }

      if (reps !== null && (!Number.isFinite(reps) || reps <= 0)) {
        return NextResponse.json(
          { error: "Invalid reps value" },
          { status: 400 }
        );
      }

      if (
        durationSeconds !== null &&
        (!Number.isFinite(durationSeconds) || durationSeconds <= 0)
      ) {
        return NextResponse.json(
          { error: "Invalid durationSeconds value" },
          { status: 400 }
        );
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
        return NextResponse.json(
          { error: "Invalid weightKg value" },
          { status: 400 }
        );
      }
    }

    const result = await prisma.$transaction(
      async (tx: any) => {
        const activityCategory = await tx.activityCategory.findUnique({
          where: { id: activityCategoryId },
          select: {
            id: true,
            slug: true,
            name: true,
          },
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
            notes:
              typeof notes === "string" && notes.trim().length > 0
                ? notes.trim()
                : null,
            type: normalizedType,
            activityCategoryId: activityCategory.id,
            routineId:
              typeof routineId === "string" && routineId.trim().length > 0
                ? routineId.trim()
                : null,
          },
        });

        const exerciseIdsSet = new Set<string>();
        for (const item of normalizedExercises) {
          exerciseIdsSet.add(item.exerciseId);
        }
        const exerciseIds = Array.from(exerciseIdsSet);

        const existingExercisesRaw = await tx.exercise.findMany({
          where: {
            id: { in: exerciseIds },
          },
          select: {
            id: true,
            measureType: true,
          },
        });

        const existingExercises = existingExercisesRaw as ExistingExerciseEntry[];

        if (existingExercises.length !== exerciseIds.length) {
          throw new ActivityCreateHttpError(
            400,
            "One or more exercises do not exist"
          );
        }

        const exerciseById = new Map<string, ExistingExerciseEntry>();
        for (const exercise of existingExercises) {
          exerciseById.set(exercise.id, exercise);
        }

        const activityExercisesData: Array<{
          activityId: string;
          exerciseId: string;
          sets: number;
          reps: number | null;
          durationSeconds: number | null;
          weightKg: number | null;
        }> = [];

        for (const item of normalizedExercises) {
          const exercise = exerciseById.get(item.exerciseId);

          if (!exercise) {
            throw new ActivityCreateHttpError(
              400,
              "One or more exercises do not exist"
            );
          }

          const reps = parseNullableNumber(item.reps);
          const durationSeconds = parseNullableNumber(item.durationSeconds);
          const weightKg = parseNullableNumber(item.weightKg);

          activityExercisesData.push({
            activityId: activity.id,
            exerciseId: item.exerciseId,
            sets: Number(item.sets),
            reps: exercise.measureType === "reps" ? reps : null,
            durationSeconds:
              exercise.measureType === "duration" ? durationSeconds : null,
            weightKg,
          });
        }

        await tx.activityExercise.createMany({
          data: activityExercisesData,
        });

        const candidateSeasonsRaw = await tx.season.findMany({
          where: {
            isActive: true,
            startDate: { lte: s },
            endDate: { gte: s },
            members: {
              some: {
                userId: user.id,
                leftAt: null,
              },
            },
          },
          select: {
            id: true,
            weeklyGoal: true,
            basePointsPerActivity: true,
            weeklyStreakBonus: true,
            perfectWeekBonus: true,
            allowedActivityTypeLinks: {
              select: {
                activityCategoryId: true,
              },
            },
            maxScoreableMinutesPerActivity: true,
          },
        });

        const candidateSeasons = candidateSeasonsRaw as CandidateSeasonEntry[];
        const createdScoreEvents: CreatedScoreEventEntry[] = [];
        const seasonsToPostProcess: SeasonPostProcessingEntry[] = [];

        for (const season of candidateSeasons) {
          const allowedCategoryIds = normalizeAllowedActivityCategoryIds(
            season.allowedActivityTypeLinks
          );

          if (
            allowedCategoryIds.length > 0 &&
            !allowedCategoryIds.includes(activityCategory.id)
          ) {
            continue;
          }

          const previousLinkedActivitiesRaw = await tx.activitySeason.findMany({
            where: {
              seasonId: season.id,
              activity: {
                userId: user.id,
                isDeleted: false,
                startedAt: {
                  lt: s,
                },
              },
            },
            select: {
              activity: {
                select: {
                  startedAt: true,
                },
              },
            },
          });

          const previousLinkedActivities =
            previousLinkedActivitiesRaw as PreviousLinkedActivityEntry[];

          const previousDates: Date[] = [];
          for (const entry of previousLinkedActivities) {
            previousDates.push(entry.activity.startedAt);
          }

          const previousWeekCounts = buildWeekCounts(previousDates);

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

          const previousActivity = await tx.activity.findFirst({
            where: {
              userId: user.id,
              isDeleted: false,
              startedAt: { lt: s },
              activitySeasons: {
                some: {
                  seasonId: season.id,
                },
              },
            },
            orderBy: {
              startedAt: "desc",
            },
            select: {
              startedAt: true,
            },
          });

          const daysSincePreviousActivity = previousActivity
            ? diffInFullDays(s, previousActivity.startedAt)
            : null;

          const score = calculateActivityScore({
            activity: {
              id: activity.id,
              type: normalizedType,
              startedAt: s,
              endedAt: e,
              durationMinutes,
            },
            season: {
              id: season.id,
              weeklyGoal: season.weeklyGoal,
              basePointsPerActivity: season.basePointsPerActivity,
              allowedActivityTypes: [activityCategory.slug],
              maxScoreableMinutesPerActivity:
                season.maxScoreableMinutesPerActivity,
            },
            currentActiveWeekStreak,
            currentPerfectWeekStreak,
            daysSincePreviousActivity,
          });

          if (!score.eligible || score.totalPoints <= 0) {
            continue;
          }

          await tx.activitySeason.create({
            data: {
              activityId: activity.id,
              seasonId: season.id,
            },
          });

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

          createdScoreEvents.push({
            seasonId: season.id,
            points: score.totalPoints,
          });

          seasonsToPostProcess.push({
            seasonId: season.id,
            weeklyGoal: season.weeklyGoal,
          });
        }

        return {
          ok: true,
          activityId: activity.id,
          createdScoreEvents,
          seasonsToPostProcess,
        };
      },
      {
        timeout: 15000,
        maxWait: 5000,
      }
    );

    for (const season of result.seasonsToPostProcess) {
      const recalculatedWeeks = await recalculateSeasonWeekProgress({
        tx: prisma,
        seasonId: season.seasonId,
        userId: user.id,
        weeklyGoal: season.weeklyGoal,
      });

      await prisma.scoreEvent.deleteMany({
        where: {
          seasonId: season.seasonId,
          userId: user.id,
          type: {
            in: ["weekly_streak_bonus", "perfect_week_bonus"],
          },
        },
      });

      for (const week of recalculatedWeeks) {
        await applyWeeklyBonuses({
          tx: prisma,
          seasonId: season.seasonId,
          userId: user.id,
          weekStart: week.weekStart,
        });
      }
    }

    return NextResponse.json(
      {
        ok: result.ok,
        activityId: result.activityId,
        createdScoreEvents: result.createdScoreEvents,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ActivityCreateHttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error("/api/activities/create error:", err);
    return NextResponse.json(
      { error: "Error creating activity" },
      { status: 500 }
    );
  }
}