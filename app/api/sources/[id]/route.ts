import { NextRequest, NextResponse } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRequiredAuthSession();
    const userId = session.user!.id;
    const { id } = await params;

    const source = await prisma.source.findFirst({
      where: { id, userId },
      include: {
        chunks: {
          orderBy: { chunkIndex: "asc" },
          select: {
            id: true,
            chunkIndex: true,
            content: true,
          },
        },
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    return NextResponse.json({ source });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Source detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRequiredAuthSession();
    const userId = session.user!.id;
    const { id } = await params;

    // Verify ownership before deleting
    const source = await prisma.source.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Cascade delete: chunks are automatically deleted via onDelete: Cascade in schema
    await prisma.source.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Source delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
