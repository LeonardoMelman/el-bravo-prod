import { prisma } from "@/src/lib/db";
import { createExerciseSchema } from "@/src/schemas/exercise";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/currentUser";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, measureType, muscles } = createExerciseSchema.parse(body);

    const normalizedName = name.trim();

    if (!normalizedName) {
      return NextResponse.json(
        { error: "Nombre inválido" },
        { status: 400 }
      );
    }

    // 1) Si ya existe uno global con ese nombre, devolverlo
    const existingGlobalExercise = await prisma.exercise.findFirst({
      where: {
        name: normalizedName,
        createdByUserId: null,
      },
      select: {
        id: true,
        name: true,
        measureType: true,
        createdByUserId: true,
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
    });

    if (existingGlobalExercise) {
      return NextResponse.json(existingGlobalExercise, { status: 200 });
    }

    // 2) Si ya existe uno privado del mismo usuario con ese nombre, devolverlo
    const existingUserExercise = await prisma.exercise.findFirst({
      where: {
        name: normalizedName,
        createdByUserId: user.id,
      },
      select: {
        id: true,
        name: true,
        measureType: true,
        createdByUserId: true,
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
    });

    if (existingUserExercise) {
      return NextResponse.json(existingUserExercise, { status: 200 });
    }

    // 3) Crear ejercicio privado del usuario
    const createdExercise = await prisma.exercise.create({
      data: {
        name: normalizedName,
        measureType,
        createdByUserId: user.id,
        muscles: Array.isArray(muscles) && muscles.length > 0
          ? {
              create: muscles.map((item: { muscleId: string; percentage: number }) => ({
                muscleId: item.muscleId,
                percentage: item.percentage,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        measureType: true,
        createdByUserId: true,
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
    });

    return NextResponse.json(createdExercise, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { errors: error.issues },
        { status: 400 }
      );
    }

    console.error("/api/exercise/create error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}