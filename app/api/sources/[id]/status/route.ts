import { NextResponse } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toSourceSummary } from "@/lib/sources/source-status";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRequiredAuthSession();
    const { id } = await params;

    const source = await prisma.source.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        sourceType: true,
        sourceUrl: true,
        author: true,
        captureDate: true,
        status: true,
        processingProgress: true,
        metadata: true,
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    return NextResponse.json(toSourceSummary(source));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
