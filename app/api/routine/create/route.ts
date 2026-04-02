import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { createRoutineSchema } from "@/src/schemas/routine";
import { getCurrentUser } from "@/src/lib/currentUser";
import { z } from "zod";

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

    const exerciseIds = Array.from(
      new Set(
        exercises
          .map((e) => e.exerciseId)
          .filter((id) => id && id !== "__new")
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

    const routine = await prisma.routine.create({
      data: {
        name,
        user: {
          connect: { id: user.id },
        },
        exercises: {
          create: exercises.map((e: any) => {
            const exercise = exerciseById.get(e.exerciseId);

            const reps =
              e.reps === null || e.reps === undefined || e.reps === ""
                ? null
                : Number(e.reps);

            const durationSeconds =
              e.durationSeconds === null ||
              e.durationSeconds === undefined ||
              e.durationSeconds === ""
                ? null
                : Number(e.durationSeconds);

            return {
              sets: Number(e.sets),
              reps: exercise?.measureType === "reps" ? reps : null,
              durationSeconds:
                exercise?.measureType === "duration" ? durationSeconds : null,
              weightKg:
                e.weightKg === null || e.weightKg === undefined || e.weightKg === ""
                  ? null
                  : Number(e.weightKg),
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