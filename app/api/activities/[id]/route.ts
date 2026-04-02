import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/currentUser";
import { prisma } from "@/src/lib/db";
import { recalculateSeasonWeekProgress } from "@/src/lib/scoring/recalculateSeasonWeekProgress";
import { applyWeeklyBonuses } from "@/src/lib/scoring/applyWeeklyBonuses";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing activity id" }, { status: 400 });
    }

    const activity = await prisma.activity.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        isDeleted: true,
        activitySeasons: {
          select: {
            seasonId: true,
            season: {
              select: {
                id: true,
                weeklyGoal: true,
              },
            },
          },
        },
      },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    if (activity.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (activity.isDeleted) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const affectedSeasons = activity.activitySeasons.map((item: {
      seasonId: string;
      season: { weeklyGoal: number };
    }) => ({
      seasonId: item.seasonId,
      weeklyGoal: item.season.weeklyGoal,
    }));

    await prisma.$transaction(async (tx) => {
      await tx.scoreEvent.deleteMany({
        where: {
          activityId: id,
          userId: user.id,
        },
      });

      await tx.activitySeason.deleteMany({
        where: {
          activityId: id,
        },
      });

      await tx.activityMedia.deleteMany({
        where: {
          activityId: id,
        },
      });

      await tx.activityExercise.deleteMany({
        where: {
          activityId: id,
        },
      });

      await tx.activity.update({
        where: { id },
        data: {
          isDeleted: true,
        },
      });

      for (const season of affectedSeasons) {
        const recalculatedWeeks = await recalculateSeasonWeekProgress({
          tx,
          seasonId: season.seasonId,
          userId: user.id,
          weeklyGoal: season.weeklyGoal,
        });

        await tx.scoreEvent.deleteMany({
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
            tx,
            seasonId: season.seasonId,
            userId: user.id,
            weekStart: week.weekStart,
          });
        }
      }
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("/api/activities/[id] DELETE error:", err);

    return NextResponse.json(
      { error: "Error deleting activity" },
      { status: 500 }
    );
  }
}