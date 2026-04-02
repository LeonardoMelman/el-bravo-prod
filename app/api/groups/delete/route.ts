import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/currentUser";
import { prisma } from "@/src/lib/db";

type SeasonIdRow = {
  id: string;
};

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as { groupId?: unknown }));
    const { groupId } = body ?? {};

    if (!groupId || typeof groupId !== "string") {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }

    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: user.id,
        leftAt: null,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    if (membership.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.$transaction(async (tx: any) => {
      const seasonsRaw = await tx.season.findMany({
        where: { groupId },
        select: { id: true },
      });

      const seasons = seasonsRaw as SeasonIdRow[];
      const seasonIds: string[] = [];

      for (const season of seasons) {
        seasonIds.push(season.id);
      }

      if (seasonIds.length > 0) {
        await tx.awardEarned.deleteMany({
          where: {
            seasonId: { in: seasonIds },
          },
        });

        await tx.seasonMember.deleteMany({
          where: {
            seasonId: { in: seasonIds },
          },
        });

        await tx.season.deleteMany({
          where: {
            id: { in: seasonIds },
          },
        });
      }

      await tx.groupMember.deleteMany({
        where: { groupId },
      });

      await tx.group.delete({
        where: { id: groupId },
      });
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("/api/groups/delete error:", err);

    return NextResponse.json(
      { error: "Error deleting group" },
      { status: 500 }
    );
  }
}