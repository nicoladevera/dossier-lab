import { NextResponse } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma/client";
import { mapLegacyEvaluationToBackfillPayload } from "@/lib/services/qa/chat-history";

interface BackfillRequestBody {
  limit?: number;
}

function clampLimit(value: number | undefined): number {
  if (!value || Number.isNaN(value)) return 100;
  return Math.min(500, Math.max(1, Math.floor(value)));
}

export async function POST(request: Request) {
  try {
    const session = await getRequiredAuthSession();
    const userId = session.user!.id;

    let body: BackfillRequestBody = {};
    try {
      body = (await request.json()) as BackfillRequestBody;
    } catch {
      body = {};
    }

    const limit = clampLimit(body.limit);

    const where = {
      userId,
      assistantMessageId: null,
    };

    const pendingBefore = await prisma.evaluation.count({ where });
    const evaluations = await prisma.evaluation.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: limit,
      select: {
        id: true,
        query: true,
        answer: true,
        createdAt: true,
      },
    });

    let imported = 0;
    let failed = 0;

    for (const evaluation of evaluations) {
      try {
        const payload = mapLegacyEvaluationToBackfillPayload({
          query: evaluation.query,
          answer: evaluation.answer,
          createdAt: evaluation.createdAt,
        });

        await prisma.$transaction(async (tx) => {
          const thread = await tx.chatThread.create({
            data: {
              userId,
              title: payload.title,
              createdAt: payload.createdAt,
              updatedAt: payload.createdAt,
            },
            select: { id: true },
          });

          await tx.chatMessage.create({
            data: {
              threadId: thread.id,
              userId,
              role: "USER",
              content: payload.userContent,
              legacyImported: true,
              createdAt: payload.createdAt,
            },
          });

          const assistantCreatedAt = new Date(payload.createdAt.getTime() + 1);
          const assistantMessage = await tx.chatMessage.create({
            data: {
              threadId: thread.id,
              userId,
              role: "ASSISTANT",
              content: payload.assistantContent,
              citations: Prisma.JsonNull,
              noContext: false,
              legacyImported: true,
              createdAt: assistantCreatedAt,
            },
            select: { id: true },
          });

          await tx.evaluation.update({
            where: { id: evaluation.id },
            data: { assistantMessageId: assistantMessage.id },
          });
        });

        imported++;
      } catch (err) {
        failed++;
        console.error("QA history backfill failed for evaluation", evaluation.id, err);
      }
    }

    const remaining = await prisma.evaluation.count({ where });

    return NextResponse.json({
      scanned: evaluations.length,
      imported,
      failed,
      pendingBefore,
      remaining,
      done: remaining === 0,
      limit,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("QA history backfill error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
