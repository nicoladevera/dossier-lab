import { NextRequest, NextResponse } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/evaluation/feedback — returns aggregate feedback stats.
// Optional ?days=N to scope to recent N days; omit for all-time.
export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredAuthSession();
    const userId = session.user!.id;

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get("days");

    const where: {
      userId: string;
      role: "ASSISTANT";
      createdAt?: { gte: Date };
    } = { userId, role: "ASSISTANT" };
    if (daysParam) {
      const days = parseInt(daysParam, 10);
      if (!Number.isNaN(days) && days > 0) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        where.createdAt = { gte: since };
      }
    }

    const totalResponses = await prisma.chatMessage.count({ where });
    const goodCount = await prisma.chatMessage.count({
      where: { ...where, userFeedback: "GOOD" },
    });
    const badCount = await prisma.chatMessage.count({
      where: { ...where, userFeedback: "BAD" },
    });

    const ratedCount = goodCount + badCount;
    const goodRatePct =
      ratedCount > 0 ? Math.round((goodCount / ratedCount) * 100) : null;
    const badRatePct =
      ratedCount > 0 ? Math.round((badCount / ratedCount) * 100) : null;
    const ratingCoveragePct =
      totalResponses > 0
        ? Math.round((ratedCount / totalResponses) * 100)
        : null;

    return NextResponse.json({
      good: goodCount,
      bad: badCount,
      ratedCount,
      totalResponses,
      // Temporary compatibility alias for older callers.
      totalQueries: totalResponses,
      goodRatePct,
      badRatePct,
      ratingCoveragePct,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Feedback stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getRequiredAuthSession();
    const userId = session.user!.id;
    const { evaluationId, feedback } = await request.json();

    if (
      !evaluationId ||
      !(feedback === "GOOD" || feedback === "BAD" || feedback === null)
    ) {
      return NextResponse.json(
        { error: "Invalid feedback" },
        { status: 400 }
      );
    }

    // Ensure the evaluation belongs to this user
    const evaluation = await prisma.evaluation.findFirst({
      where: { id: evaluationId, userId },
    });

    if (!evaluation) {
      return NextResponse.json(
        { error: "Evaluation not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.evaluation.update({
        where: { id: evaluationId },
        data: { userFeedback: feedback },
      });

      if (evaluation.assistantMessageId) {
        await tx.chatMessage.updateMany({
          where: {
            id: evaluation.assistantMessageId,
            userId,
            role: "ASSISTANT",
          },
          data: {
            userFeedback: feedback,
            feedbackUpdatedAt: new Date(),
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH for manual relevance override
export async function PATCH(request: Request) {
  try {
    const session = await getRequiredAuthSession();
    const userId = session.user!.id;
    const { evaluationId, chunkIndex, relevant } = await request.json();

    if (
      !evaluationId ||
      chunkIndex === undefined ||
      typeof relevant !== "boolean"
    ) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (typeof chunkIndex !== "number" || !Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex > 1000) {
      return NextResponse.json({ error: "Invalid chunk index" }, { status: 400 });
    }

    const evaluation = await prisma.evaluation.findFirst({
      where: { id: evaluationId, userId },
    });

    if (!evaluation) {
      return NextResponse.json(
        { error: "Evaluation not found" },
        { status: 404 }
      );
    }

    // Update the retrieval scores
    const currentScores = (evaluation.retrievalScores as number[]) || [];
    const updatedScores = [...currentScores];
    while (updatedScores.length <= chunkIndex) {
      updatedScores.push(0.5);
    }
    updatedScores[chunkIndex] = relevant ? 1.0 : 0.0;

    await prisma.evaluation.update({
      where: { id: evaluationId },
      data: { retrievalScores: updatedScores },
    });

    return NextResponse.json({ success: true, retrievalScores: updatedScores });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
