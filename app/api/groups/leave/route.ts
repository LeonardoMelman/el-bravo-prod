import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/currentUser";
import { prisma } from "@/src/lib/db";

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
      return NextResponse.json({ error: "Not a member" }, { status: 400 });
    }

    const [otherAdmins, otherMembers] = await Promise.all([
      prisma.groupMember.count({
        where: {
          groupId,
          leftAt: null,
          role: "admin",
          NOT: { userId: user.id },
        },
      }),
      prisma.groupMember.count({
        where: {
          groupId,
          leftAt: null,
          NOT: { userId: user.id },
        },
      }),
    ]);

    if (membership.role === "admin" && otherMembers > 0 && otherAdmins === 0) {
      return NextResponse.json(
        { error: "Sos el único admin. Asigná otro admin antes de salir." },
        { status: 400 }
      );
    }

    const now = new Date();

    if (membership.role === "admin" && otherMembers === 0) {
      await prisma.$transaction(async (tx: any) => {
        await tx.seasonMember.deleteMany({
          where: {
            season: {
              groupId,
            },
          },
        });

        await tx.season.deleteMany({
          where: { groupId },
        });

        await tx.groupMember.deleteMany({
          where: { groupId },
        });

        await tx.group.delete({
          where: { id: groupId },
        });
      });

      return NextResponse.json({ ok: true, deleted: true }, { status: 200 });
    }

    await prisma.$transaction([
      prisma.groupMember.update({
        where: { id: membership.id },
        data: { leftAt: now },
      }),
      prisma.seasonMember.updateMany({
        where: {
          userId: user.id,
          leftAt: null,
          season: { groupId },
        },
        data: { leftAt: now },
      }),
    ]);

    return NextResponse.json({ ok: true, deleted: false }, { status: 200 });
  } catch (err) {
    console.error("/api/groups/leave error:", err);
    return NextResponse.json({ error: "Error leaving group" }, { status: 500 });
  }
}