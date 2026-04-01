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

    await prisma.seasonMember.create({
      data: {
        seasonId,
        userId: user.id,
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    console.error("/api/seasons/join error:", error);
    return NextResponse.json({ error: "Error joining season" }, { status: 500 });
  }
}