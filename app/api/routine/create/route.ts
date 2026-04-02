import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { createRoutineSchema } from "@/src/schemas/routine";
import { getCurrentUser } from "@/src/lib/currentUser";
import { z } from "zod";

type RoutineExerciseMeasureType = "reps" | "duration";

type ParsedRoutineExerciseInput = {
  exerciseId: string;
  sets: number | string;
  reps?: number | string | null;
  durationSeconds?: number | string | null;
  weightKg?: number | string | null;
};

type ExistingExerciseRow = {
  id: string;
  measureType: RoutineExerciseMeasureType;
};

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name, exercises } = createRoutineSchema.parse(body);

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const normalizedExercises = exercises as ParsedRoutineExerciseInput[];

    const exerciseIds = Array.from(
      new Set(
        normalizedExercises
          .map((e: ParsedRoutineExerciseInput) => e.exerciseId)
          .filter((id: unknown): id is string => typeof id === "string" && id !== "__new")
      )
    );

    const existingExercisesRaw =
      exerciseIds.length > 0
        ? await prisma.exercise.findMany({
            where: { id: { in: exerciseIds } },
            select: { id: true, measureType: true },
          })
        : [];

    const existingExercises = existingExercisesRaw as ExistingExerciseRow[];

    if (existingExercises.length !== exerciseIds.length) {
      return NextResponse.json(
        { error: "One or more exercises do not exist" },
        { status: 400 }
      );
    }

    const exerciseById = new Map<string, ExistingExerciseRow>();
    for (const item of existingExercises) {
      exerciseById.set(item.id, item);
    }

    const routine = await prisma.routine.create({
      data: {
        name,
        user: {
          connect: { id: user.id },
        },
        exercises: {
          create: normalizedExercises.map((e: ParsedRoutineExerciseInput) => {
            const exercise = exerciseById.get(e.exerciseId);

            if (!exercise) {
              throw new Error("Exercise not found while creating routine");
            }

            const reps = parseNullableNumber(e.reps);
            const durationSeconds = parseNullableNumber(e.durationSeconds);
            const weightKg = parseNullableNumber(e.weightKg);

            return {
              sets: Number(e.sets),
              reps: exercise.measureType === "reps" ? reps : null,
              durationSeconds:
                exercise.measureType === "duration" ? durationSeconds : null,
              weightKg,
              exercise: {
                connect: { id: e.exerciseId },
              },
            };
          }),
        },
      },
    });

    return NextResponse.json(routine, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { errors: error.issues },
        { status: 400 }
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}