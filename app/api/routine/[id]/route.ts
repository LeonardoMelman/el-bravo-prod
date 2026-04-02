import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/db";
import { getCurrentUser } from "@/src/lib/currentUser";

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
      exercises: routine.exercises.map((re) => ({
        exerciseId: re.exerciseId,
        name: re.exercise.name,
        measureType: re.exercise.measureType,
        sets: re.sets,
        reps: re.reps ?? null,
        durationSeconds: re.durationSeconds ?? null,
        weightKg: re.weightKg ?? null,
      })),
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
    const { name, exercises } = body;

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

    const exerciseIds = Array.from(
      new Set(
        exercises
          .map((e: any) => e.exerciseId)
          .filter((exerciseId: unknown) => typeof exerciseId === "string" && exerciseId)
      )
    );

    const existingExercises =
      exerciseIds.length > 0
        ? await prisma.exercise.findMany({
            where: { id: { in: exerciseIds } },
            select: { id: true, measureType: true },
          })
        : [];

    if (existingExercises.length !== exerciseIds.length) {
      return NextResponse.json(
        { error: "One or more exercises do not exist" },
        { status: 400 }
      );
    }

    const exerciseById = new Map(existingExercises.map((item) => [item.id, item]));

    await prisma.routineExercise.deleteMany({
      where: { routineId: id },
    });

    await prisma.routine.update({
      where: { id },
      data: {
        name,
        exercises: {
          create: exercises.map((ex: any) => {
            const exercise = exerciseById.get(ex.exerciseId)!;

            const reps =
              ex.reps === null || ex.reps === undefined || ex.reps === ""
                ? null
                : Number(ex.reps);

            const durationSeconds =
              ex.durationSeconds === null ||
              ex.durationSeconds === undefined ||
              ex.durationSeconds === ""
                ? null
                : Number(ex.durationSeconds);

            return {
              sets: Number(ex.sets),
              reps: exercise.measureType === "reps" ? reps : null,
              durationSeconds:
                exercise.measureType === "duration" ? durationSeconds : null,
              weightKg:
                ex.weightKg === null ||
                ex.weightKg === undefined ||
                ex.weightKg === ""
                  ? null
                  : Number(ex.weightKg),
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