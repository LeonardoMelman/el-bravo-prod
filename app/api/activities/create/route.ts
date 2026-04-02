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

type ActivityType = "gym" | "run" | "sport" | "mobility" | "other";

function isValidActivityType(value: unknown): value is ActivityType {
  return (
    value === "gym" ||
    value === "run" ||
    value === "sport" ||
    value === "mobility" ||
    value === "other"
  );
}

function normalizeAllowedActivityTypes(value: unknown): ActivityType[] | null {
  if (!Array.isArray(value)) return null;

  const valid = value.filter((item): item is ActivityType =>
    isValidActivityType(item)
  );

  return valid.length > 0 ? valid : null;
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
      type,
      routineId,
      exercises = [],
    } = body ?? {};

    if (!startedAt || !endedAt) {
      return NextResponse.json(
        { error: "Start and end required" },
        { status: 400 }
      );
    }

    const normalizedType: ActivityType = type ?? "gym";

    if (!isValidActivityType(normalizedType)) {
      return NextResponse.json(
        { error: "Invalid activity type" },
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

    const result = await prisma.$transaction(async (tx) => {
      const weekStart = startOfWeekMonday(s);

      // 1) Crear actividad
      const activity = await tx.activity.create({
        data: {
          userId: user.id,
          startedAt: s,
          endedAt: e,
          durationMinutes,
          notes: notes ?? null,
          type: normalizedType,
          routineId: routineId ?? null,
        },
      });

      // 2) Crear ejercicios de la actividad
      if (Array.isArray(exercises) && exercises.length > 0) {
        await tx.activityExercise.createMany({
          data: exercises.map((item: any) => ({
            activityId: activity.id,
            exerciseId: item.exerciseId,
            sets: Number(item.sets),
            reps: Number(item.reps),
            weightKg:
              item.weightKg === null ||
              item.weightKg === undefined ||
              item.weightKg === ""
                ? null
                : Number(item.weightKg),
          })),
        });
      }

      // 3) Seasons activas aplicables del usuario
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
          allowedActivityTypes: true,
          maxScoreableMinutesPerActivity: true,
        },
      });

      const createdScoreEvents: Array<{
        seasonId: string;
        points: number;
      }> = [];

      for (const season of candidateSeasons) {
        const allowedTypes = normalizeAllowedActivityTypes(
          season.allowedActivityTypes
        );

        if (allowedTypes && !allowedTypes.includes(normalizedType)) {
          continue;
        }

        // 4) Historial previo del usuario en ESA season
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
          (item) => item.activity.startedAt
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

        // 5) Calcular score
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
            allowedActivityTypes: season.allowedActivityTypes,
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

        // 6) Vincular actividad a season
        await tx.activitySeason.create({
          data: {
            activityId: activity.id,
            seasonId: season.id,
          },
        });

        // 7) Crear ScoreEvent base
        await tx.scoreEvent.create({
          data: {
            seasonId: season.id,
            userId: user.id,
            activityId: activity.id,
            weekStart,
            type: "activity_base",
            points: score.totalPoints,
            reason: "Scoring base por actividad",
            metadata: score.metadata,
          },
        });

        createdScoreEvents.push({
          seasonId: season.id,
          points: score.totalPoints,
        });

        // 8) Recalcular progreso semanal completo
        const recalculatedWeeks = await recalculateSeasonWeekProgress({
          tx,
          seasonId: season.id,
          userId: user.id,
          weeklyGoal: season.weeklyGoal,
        });

        // 9) Borrar bonus semanales viejos de la season/user
        await tx.scoreEvent.deleteMany({
          where: {
            seasonId: season.id,
            userId: user.id,
            type: {
              in: ["weekly_streak_bonus", "perfect_week_bonus"],
            },
          },
        });

        // 10) Reaplicar bonus semanales sobre todas las semanas recalculadas
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
        id: activity.id,
        durationMinutes,
        createdScoreEvents,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("/api/activities/create error:", err);

    return NextResponse.json(
      { error: "Error creating activity" },
      { status: 500 }
    );
  }
}