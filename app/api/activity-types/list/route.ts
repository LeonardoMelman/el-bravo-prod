import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/currentUser";
import { prisma } from "@/src/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await prisma.activityCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("/api/activity-types/list error:", error);
    return NextResponse.json(
      { error: "Error loading activity types" },
      { status: 500 }
    );
  }
}