import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/db";
import { getCurrentUser } from "@/src/lib/currentUser";

type RoutineExerciseMeasureType = "reps" | "duration";

type RoutineExerciseInput = {
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

// ==========================
// GET /api/routine/[id]
// ==========================
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    if (!id) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const routine = await prisma.routine.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
        },
      },
    });

    if (!routine) {
      return NextResponse.json(
        { error: "Rutina no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: routine.id,
      name: routine.name,
      exercises: routine.exercises.map(
        (re: {
          exerciseId: string;
          sets: number;
          reps: number | null;
          durationSeconds: number | null;
          weightKg: number | null;
          exercise: {
            name: string;
            measureType: RoutineExerciseMeasureType;
          };
        }) => ({
          exerciseId: re.exerciseId,
          name: re.exercise.name,
          measureType: re.exercise.measureType,
          sets: re.sets,
          reps: re.reps ?? null,
          durationSeconds: re.durationSeconds ?? null,
          weightKg: re.weightKg ?? null,
        })
      ),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error obteniendo rutina" },
      { status: 500 }
    );
  }
}

// ==========================
// PUT /api/routine/[id]
// ==========================
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, exercises } = body ?? {};

    if (!id || !name || !Array.isArray(exercises)) {
      return NextResponse.json(
        { error: "Datos inválidos" },
        { status: 400 }
      );
    }

    const routine = await prisma.routine.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!routine) {
      return NextResponse.json(
        { error: "Rutina no encontrada" },
        { status: 404 }
      );
    }

    const normalizedExercises = exercises as RoutineExerciseInput[];

    const exerciseIds = Array.from(
      new Set(
        normalizedExercises
          .map((e: RoutineExerciseInput) => e.exerciseId)
          .filter(
            (exerciseId: unknown): exerciseId is string =>
              typeof exerciseId === "string" && exerciseId.length > 0
          )
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

    await prisma.routineExercise.deleteMany({
      where: { routineId: id },
    });

    await prisma.routine.update({
      where: { id },
      data: {
        name,
        exercises: {
          create: normalizedExercises.map((ex: RoutineExerciseInput) => {
            const exercise = exerciseById.get(ex.exerciseId);

            if (!exercise) {
              throw new Error("Exercise not found while updating routine");
            }

            const reps = parseNullableNumber(ex.reps);
            const durationSeconds = parseNullableNumber(ex.durationSeconds);
            const weightKg = parseNullableNumber(ex.weightKg);

            return {
              sets: Number(ex.sets),
              reps: exercise.measureType === "reps" ? reps : null,
              durationSeconds:
                exercise.measureType === "duration" ? durationSeconds : null,
              weightKg,
              exercise: {
                connect: { id: ex.exerciseId },
              },
            };
          }),
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error actualizando rutina" },
      { status: 500 }
    );
  }
}

// ==========================
// DELETE /api/routine/[id]
// ==========================
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    if (!id) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const routine = await prisma.routine.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!routine) {
      return NextResponse.json(
        { error: "Rutina no encontrada" },
        { status: 404 }
      );
    }

    await prisma.routineExercise.deleteMany({
      where: { routineId: id },
    });

    await prisma.routine.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error eliminando rutina" },
      { status: 500 }
    );
  }
}