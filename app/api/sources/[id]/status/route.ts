import { NextResponse } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
        status: true,
        processingProgress: true,
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    return NextResponse.json(source);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
