import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/currentUser";
import { prisma } from "@/src/lib/db";
import { finalizeSeasonScoring } from "@/src/lib/scoring/finalizeSeasonScoring";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { groupId, seasonId } = body ?? {};

    if (!groupId || !seasonId) {
      return NextResponse.json(
        { error: "Missing groupId or seasonId" },
        { status: 400 }
      );
    }

    const membership = await prisma.groupMember.findFirst({
      where: {
        userId: user.id,
        groupId,
        leftAt: null,
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    if (membership.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const season = await prisma.season.findFirst({
      where: {
        id: seasonId,
        groupId,
      },
      select: {
        id: true,
        isActive: true,
        endDate: true,
      },
    });

    if (!season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      return finalizeSeasonScoring({
        tx,
        seasonId,
      });
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("/api/seasons/finalize error:", err);
    return NextResponse.json(
      { error: "Error finalizing season" },
      { status: 500 }
    );
  }
}