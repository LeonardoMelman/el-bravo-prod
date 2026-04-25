// Manual scoring recalculation endpoint.
// Use this when async background scoring has failed or scores appear stale.
// Also useful for admin backfill after DB migrations or scoring rule changes.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/currentUser";
import { prisma } from "@/src/lib/db";
import { recalculateUserSeasonScoring } from "@/src/lib/scoring/recalculateUserSeasonScoring";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { seasonId } = body ?? {};

    const t0 = Date.now();

    if (seasonId && typeof seasonId === "string") {
      // Recalculate a specific season for the calling user
      const season = await prisma.season.findUnique({
        where: { id: seasonId },
        select: {
          id: true,
          weeklyGoal: true,
          members: {
            where: { userId: user.id, leftAt: null },
            select: { userId: true },
          },
        },
      });

      if (!season) {
        return NextResponse.json({ error: "Season not found" }, { status: 404 });
      }
      if (season.members.length === 0) {
        return NextResponse.json({ error: "Not a member of this season" }, { status: 403 });
      }

      await recalculateUserSeasonScoring({
        db: prisma,
        userId: user.id,
        seasonId: season.id,
        weeklyGoal: season.weeklyGoal,
        label: "manual",
      });

      return NextResponse.json({ ok: true, ms: Date.now() - t0 }, { status: 200 });
    }

    // No seasonId → recalculate all active seasons for the calling user
    const activeSeasons = await prisma.season.findMany({
      where: {
        isActive: true,
        members: { some: { userId: user.id, leftAt: null } },
      },
      select: { id: true, weeklyGoal: true },
    });

    for (const season of activeSeasons) {
      await recalculateUserSeasonScoring({
        db: prisma,
        userId: user.id,
        seasonId: season.id,
        weeklyGoal: season.weeklyGoal,
        label: "manual-all",
      });
    }

    return NextResponse.json(
      { ok: true, seasons: activeSeasons.length, ms: Date.now() - t0 },
      { status: 200 }
    );
  } catch (err) {
    console.error("/api/scoring/recalculate error:", err);
    return NextResponse.json({ error: "Recalculation failed" }, { status: 500 });
  }
}
