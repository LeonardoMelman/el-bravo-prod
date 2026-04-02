import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/currentUser";
import { prisma } from "@/src/lib/db";

function parseDateOnly(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function normalizeAllowedActivityCategoryIds(input: unknown) {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(input.filter((value): value is string => typeof value === "string" && value.length > 0))
  );
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const {
      groupId,
      name,
      startDate,
      endDate,
      minPerWeek,
      description,
      allowedActivityCategoryIds,
    } = body ?? {};

    if (!groupId || typeof groupId !== "string") {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }

    if (!name || typeof name !== "string" || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const normalizedWeeklyGoal = Number(minPerWeek);

    if (
      !Number.isInteger(normalizedWeeklyGoal) ||
      normalizedWeeklyGoal < 1 ||
      normalizedWeeklyGoal > 7
    ) {
      return NextResponse.json({ error: "Invalid weekly goal" }, { status: 400 });
    }

    const normalizedAllowedActivityCategoryIds =
      normalizeAllowedActivityCategoryIds(allowedActivityCategoryIds);

    if (normalizedAllowedActivityCategoryIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one allowed activity type" },
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

    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
    }

    const overlappingSeason = await prisma.season.findFirst({
      where: {
        groupId,
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
    });

    if (overlappingSeason) {
      return NextResponse.json(
        {
          error: `Las fechas se superponen con la temporada "${overlappingSeason.name}"`,
        },
        { status: 400 }
      );
    }

    const categories = await prisma.activityCategory.findMany({
      where: {
        id: { in: normalizedAllowedActivityCategoryIds },
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    if (categories.length !== normalizedAllowedActivityCategoryIds.length) {
      return NextResponse.json(
        { error: "One or more activity categories are invalid" },
        { status: 400 }
      );
    }

    const season = await prisma.$transaction(async (tx) => {
      const created = await tx.season.create({
        data: {
          groupId,
          name: name.trim(),
          description:
            typeof description === "string" && description.trim().length > 0
              ? description.trim()
              : null,
          startDate: start,
          endDate: end,
          weeklyGoal: normalizedWeeklyGoal,
          allowedActivityTypes: categories.map((item) => item.slug),
          allowedActivityTypeLinks: {
            create: categories.map((item) => ({
              activityCategoryId: item.id,
            })),
          },
        },
      });

      await tx.seasonMember.createMany({
        data: [
          {
            seasonId: created.id,
            userId: user.id,
          },
        ],
        skipDuplicates: true,
      });

      return created;
    });

    return NextResponse.json({ id: season.id }, { status: 201 });
  } catch (err) {
    console.error("/api/seasons/create error:", err);
    return NextResponse.json({ error: "Error creating season" }, { status: 500 });
  }
}