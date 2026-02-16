import { NextRequest, NextResponse } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface FeedbackRequestBody {
  feedback?: "GOOD" | "BAD" | null;
}

function isValidFeedback(value: unknown): value is "GOOD" | "BAD" | null {
  return value === "GOOD" || value === "BAD" || value === null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRequiredAuthSession();
    const userId = session.user!.id;
    const { id } = await params;

    let body: FeedbackRequestBody;
    try {
      body = (await request.json()) as FeedbackRequestBody;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!isValidFeedback(body.feedback)) {
      return NextResponse.json({ error: "Invalid feedback" }, { status: 400 });
    }

    const existing = await prisma.chatMessage.findFirst({
      where: {
        id,
        userId,
        role: "ASSISTANT",
      },
      select: {
        id: true,
        evaluation: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Assistant message not found" }, { status: 404 });
    }

    const feedbackUpdatedAt = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.update({
        where: { id: existing.id },
        data: {
          userFeedback: body.feedback,
          feedbackUpdatedAt,
        },
        select: {
          id: true,
          userFeedback: true,
          feedbackUpdatedAt: true,
        },
      });

      if (existing.evaluation?.id) {
        await tx.evaluation.updateMany({
          where: { id: existing.evaluation.id, userId },
          data: {
            userFeedback: body.feedback,
          },
        });
      }

      return message;
    });

    return NextResponse.json({
      success: true,
      messageId: updated.id,
      userFeedback: updated.userFeedback,
      feedbackUpdatedAt: updated.feedbackUpdatedAt,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("QA message feedback error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
