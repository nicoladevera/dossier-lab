import { NextRequest, NextResponse } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const VALID_TYPES = ["URL", "PDF", "WORD", "MARKDOWN", "TEXT", "YOUTUBE"] as const;

export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredAuthSession();
    const userId = session.user!.id;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const sort = searchParams.get("sort") === "oldest" ? "asc" : "desc";
    const typeFilter = searchParams.get("type");

    // Build where clause
    const where: Record<string, unknown> = { userId };

    if (typeFilter && VALID_TYPES.includes(typeFilter as typeof VALID_TYPES[number])) {
      where.sourceType = typeFilter;
    }

    const [sources, total] = await Promise.all([
      prisma.source.findMany({
        where,
        orderBy: { captureDate: sort },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          sourceType: true,
          sourceUrl: true,
          author: true,
          captureDate: true,
          status: true,
          processingProgress: true,
        },
      }),
      prisma.source.count({ where }),
    ]);

    return NextResponse.json({
      sources,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Sources list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
