import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/currentUser";
import { prisma } from "@/src/lib/db";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { groupId, seasonId } = body ?? {};

    if (!groupId || !seasonId) {
      return NextResponse.json({ error: "Missing ids" }, { status: 400 });
    }

    const membership = await prisma.groupMember.findFirst({
      where: {
        userId: user.id,
        groupId,
        leftAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a group member" }, { status: 403 });
    }

    const season = await prisma.season.findFirst({
      where: {
        id: seasonId,
        groupId,
      },
      select: {
        id: true,
        endDate: true,
      },
    });

    if (!season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    if (new Date(season.endDate) < new Date()) {
      return NextResponse.json(
        { error: "Cannot join a finished season" },
        { status: 400 }
      );
    }

    const existingActiveMembership = await prisma.seasonMember.findFirst({
      where: {
        seasonId,
        userId: user.id,
        leftAt: null,
      },
      select: {
        id: true,
      },
    });

    if (existingActiveMembership) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const now = new Date();

    await prisma.seasonMember.upsert({
      where: {
        seasonId_userId: {
          seasonId,
          userId: user.id,
        },
      },
      create: {
        seasonId,
        userId: user.id,
        joinedAt: now,
      },
      update: {
        leftAt: null,
        joinedAt: now,
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("/api/seasons/join error:", error);
    return NextResponse.json({ error: "Error joining season" }, { status: 500 });
  }
}