import { NextResponse } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getRequiredAuthSession();
    const userId = session.user!.id;
    const { evaluationId, feedback } = await request.json();

    if (!evaluationId || !["GOOD", "BAD"].includes(feedback)) {
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

    await prisma.evaluation.update({
      where: { id: evaluationId },
      data: { userFeedback: feedback },
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
