import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/currentUser";
import { prisma } from "@/src/lib/db";

function parseDateOnly(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function normalizeAllowedActivityCategoryIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return Array.from(
    new Set(
      input.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0
      )
    )
  );
}

type ActivityCategoryRow = {
  id: string;
  slug: string;
};

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const {
      groupId,
      seasonId,
      name,
      startDate,
      endDate,
      minPerWeek,
      allowedActivityCategoryIds,
      description,
    } = body ?? {};

    if (!groupId || !seasonId) {
      return NextResponse.json({ error: "Missing ids" }, { status: 400 });
    }

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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
        endDate: true,
      },
    });

    if (!season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    if (new Date(season.endDate).getTime() < Date.now()) {
      return NextResponse.json({ error: "Season finished" }, { status: 400 });
    }

    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
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

    const categories: ActivityCategoryRow[] = await prisma.activityCategory.findMany({
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

    await prisma.season.update({
      where: { id: seasonId },
      data: {
        name: String(name).trim(),
        description:
          typeof description === "string" && description.trim().length > 0
            ? description.trim()
            : null,
        startDate: start,
        endDate: end,
        weeklyGoal: normalizedWeeklyGoal,
        allowedActivityTypes: categories.map((item: ActivityCategoryRow) => item.slug),
        allowedActivityTypeLinks: {
          deleteMany: {},
          create: categories.map((item: ActivityCategoryRow) => ({
            activityCategoryId: item.id,
          })),
        },
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("/api/seasons/update error:", err);
    return NextResponse.json({ error: "Error updating season" }, { status: 500 });
  }
}