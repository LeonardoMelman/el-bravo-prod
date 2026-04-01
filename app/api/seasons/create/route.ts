import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/currentUser";
import { prisma } from "@/src/lib/db";

const ALLOWED_ACTIVITY_TYPES = ["gym", "run", "sport", "mobility", "other"] as const;

function parseDateOnly(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function normalizeAllowedActivityTypes(input: unknown) {
  if (!Array.isArray(input)) return [];

  return Array.from(
    new Set(
      input.filter(
        (value): value is (typeof ALLOWED_ACTIVITY_TYPES)[number] =>
          typeof value === "string" &&
          ALLOWED_ACTIVITY_TYPES.includes(value as (typeof ALLOWED_ACTIVITY_TYPES)[number])
      )
    )
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
      allowedActivityTypes,
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

    const normalizedAllowedActivityTypes =
      normalizeAllowedActivityTypes(allowedActivityTypes);

    if (normalizedAllowedActivityTypes.length === 0) {
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
          allowedActivityTypes: normalizedAllowedActivityTypes,
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