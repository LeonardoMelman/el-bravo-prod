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

type TxClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

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
  links: Array<{ activityCategoryId: string }>
): string[] {
  return Array.from(new Set(links.map((item) => item.activityCategoryId)));
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
      return NextResponse.json(
        { error: "Invalid dates" },
        { status: 400 }
      );
    }

    const durationMinutes = Math.max(
      0,
      Math.round((e.getTime() - s.getTime()) / (1000 * 60))
    );

    if (!Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json(
        { error: "At least one exercise is required" },
        { status: 400 }
      );
    }

    const normalizedExercises = exercises as CreateActivityExerciseInput[];

    for (const item of normalizedExercises) {
      if (!item?.exerciseId || typeof item.exerciseId !== "string") {
        return NextResponse.json(
          { error: "Invalid exerciseId" },
          { status: 400 }
        );
      }

      const sets = Number(item.sets);
      const reps =
        item.reps === null || item.reps === undefined || item.reps === ""
          ? null
          : Number(item.reps);
      const durationSeconds =
        item.durationSeconds === null ||
        item.durationSeconds === undefined ||
        item.durationSeconds === ""
          ? null
          : Number(item.durationSeconds);
      const weightKg =
        item.weightKg === null || item.weightKg === undefined || item.weightKg === ""
          ? null
          : Number(item.weightKg);

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

    const result = await prisma.$transaction(async (tx: TxClient) => {
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
          notes: notes ?? null,
          type: normalizedType,
          activityCategoryId: activityCategory.id,
          routineId: routineId ?? null,
        },
      });

      const exerciseIds = [
        ...new Set(
          normalizedExercises.map((item: CreateActivityExerciseInput) => item.exerciseId)
        ),
      ];

      const existingExercises = await tx.exercise.findMany({
        where: {
          id: { in: exerciseIds },
        },
        select: {
          id: true,
          measureType: true,
        },
      });

      const exerciseById = new Map(
        existingExercises.map(
          (item: { id: string; measureType: "reps" | "duration" }) => [item.id, item]
        )
      );

      if (existingExercises.length !== exerciseIds.length) {
        throw new ActivityCreateHttpError(400, "One or more exercises do not exist");
      }

      await tx.activityExercise.createMany({
        data: normalizedExercises.map((item: CreateActivityExerciseInput) => {
          const exercise = exerciseById.get(item.exerciseId)!;

          const reps =
            item.reps === null || item.reps === undefined || item.reps === ""
              ? null
              : Number(item.reps);

          const durationSeconds =
            item.durationSeconds === null ||
            item.durationSeconds === undefined ||
            item.durationSeconds === ""
              ? null
              : Number(item.durationSeconds);

          return {
            activityId: activity.id,
            exerciseId: item.exerciseId,
            sets: Number(item.sets),
            reps: exercise.measureType === "reps" ? reps : null,
            durationSeconds:
              exercise.measureType === "duration" ? durationSeconds : null,
            weightKg:
              item.weightKg === null ||
              item.weightKg === undefined ||
              item.weightKg === ""
                ? null
                : Number(item.weightKg),
          };
        }),
      });

      const candidateSeasons = await tx.season.findMany({
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

      const createdScoreEvents: Array<{ seasonId: string; points: number }> = [];

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

        const previousLinkedActivities = await tx.activitySeason.findMany({
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

        const previousDates = previousLinkedActivities.map(
          (item: { activity: { startedAt: Date } }) => item.activity.startedAt
        );

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

        const recalculatedWeeks = await recalculateSeasonWeekProgress({
          tx,
          seasonId: season.id,
          userId: user.id,
          weeklyGoal: season.weeklyGoal,
        });

        await tx.scoreEvent.deleteMany({
          where: {
            seasonId: season.id,
            userId: user.id,
            type: {
              in: ["weekly_streak_bonus", "perfect_week_bonus"],
            },
          },
        });

        for (const week of recalculatedWeeks) {
          await applyWeeklyBonuses({
            tx,
            seasonId: season.id,
            userId: user.id,
            weekStart: week.weekStart,
          });
        }
      }

      return {
        ok: true,
        activityId: activity.id,
        createdScoreEvents,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof ActivityCreateHttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error("/api/activities/create error:", err);
    return NextResponse.json({ error: "Error creating activity" }, { status: 500 });
  }
}