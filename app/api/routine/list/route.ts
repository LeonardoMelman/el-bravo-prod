import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { getCurrentUser } from "@/src/lib/currentUser";

type RoutineExerciseMeasureType = "reps" | "duration";

type RoutineListRow = {
  id: string;
  name: string;
  createdAt: Date;
  exercises: Array<{
    id: string;
    sets: number;
    reps: number | null;
    durationSeconds: number | null;
    weightKg: number | null;
    exercise: {
      id: string;
      name: string;
      measureType: RoutineExerciseMeasureType;
      muscles: Array<{
        exerciseId: string;
        muscleId: string;
        percentage: number;
        muscle: {
          id: string;
          name: string;
          slug: string;
          groupKey: string;
        };
      }>;
    };
  }>;
};

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const routinesRaw = await prisma.routine.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        exercises: {
          select: {
            id: true,
            sets: true,
            reps: true,
            durationSeconds: true,
            weightKg: true,
            exercise: {
              select: {
                id: true,
                name: true,
                measureType: true,
                muscles: {
                  select: {
                    exerciseId: true,
                    muscleId: true,
                    percentage: true,
                    muscle: {
                      select: {
                        id: true,
                        name: true,
                        slug: true,
                        groupKey: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const routines = routinesRaw as RoutineListRow[];

    const formatted = routines.map((routine: RoutineListRow) => ({
      id: routine.id,
      name: routine.name,
      createdAt: routine.createdAt,
      exercises: routine.exercises.map((entry) => ({
        id: entry.id,
        exerciseId: entry.exercise.id,
        name: entry.exercise.name,
        measureType: entry.exercise.measureType,
        sets: entry.sets,
        reps: entry.reps ?? null,
        durationSeconds: entry.durationSeconds ?? null,
        weightKg: entry.weightKg ?? null,
        muscles: entry.exercise.muscles.map((muscleEntry) => ({
          exerciseId: muscleEntry.exerciseId,
          muscleId: muscleEntry.muscleId,
          percentage: muscleEntry.percentage,
          muscle: {
            id: muscleEntry.muscle.id,
            name: muscleEntry.muscle.name,
            slug: muscleEntry.muscle.slug,
            groupKey: muscleEntry.muscle.groupKey,
          },
        })),
      })),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("/api/routine/list error:", error);

    return NextResponse.json(
      { error: "Error cargando rutinas" },
      { status: 500 }
    );
  }
}