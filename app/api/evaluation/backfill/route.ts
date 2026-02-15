import { NextResponse } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma/client";
import { createLLMProvider } from "@/lib/services/llm/provider-factory";
import { decrypt } from "@/lib/services/encryption";
import { scoreGroundedness } from "@/lib/services/evaluation/groundedness";
import { scoreRetrievalAccuracy } from "@/lib/services/evaluation/retrieval-accuracy";
import { resolveOpenAIApiKey } from "@/lib/services/embedding/provider-factory";

interface BackfillRequestBody {
  limit?: number;
  days?: number;
}

function clampLimit(value: number | undefined): number {
  if (!value || Number.isNaN(value)) return 10;
  return Math.min(25, Math.max(1, Math.floor(value)));
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
    const days =
      typeof body.days === "number" && Number.isFinite(body.days) && body.days > 0
        ? Math.floor(body.days)
        : null;

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    const provider = settings?.defaultProvider || "OPENAI";
    const model = settings?.defaultModel || "gpt-4o";
    const llmApiKey =
      provider === "ANTHROPIC"
        ? (settings?.anthropicApiKey
            ? decrypt(settings.anthropicApiKey)
            : process.env.ANTHROPIC_API_KEY) || ""
        : resolveOpenAIApiKey(settings);

    if (!llmApiKey) {
      return NextResponse.json(
        {
          error: `No API key configured for ${provider}. Add your API key in Settings before backfilling.`,
        },
        { status: 400 }
      );
    }

    const llmProvider = createLLMProvider(provider, model, llmApiKey);

    const createdAtFilter = days
      ? { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
      : undefined;

    const where = {
      userId,
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      OR: [
        { retrievalScores: { equals: Prisma.AnyNull } },
        { groundednessScore: null },
      ],
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
        retrievedChunkIds: true,
        retrievalScores: true,
        groundednessScore: true,
      },
    });

    let updated = 0;
    let failed = 0;

    for (const ev of evaluations) {
      try {
        const existingScores = Array.isArray(ev.retrievalScores)
          ? (ev.retrievalScores as number[])
          : null;
        const needsRetrieval =
          existingScores === null || existingScores.length === 0;
        const needsGroundedness = ev.groundednessScore === null;

        if (!needsRetrieval && !needsGroundedness) {
          continue;
        }

        const chunks = await prisma.chunk.findMany({
          where: {
            id: { in: ev.retrievedChunkIds },
            userId,
          },
          select: {
            id: true,
            content: true,
          },
        });

        const chunkById = new Map(chunks.map((chunk) => [chunk.id, chunk.content]));
        const chunkContents = ev.retrievedChunkIds
          .map((chunkId) => chunkById.get(chunkId))
          .filter((content): content is string => Boolean(content));

        const retrievalScores = needsRetrieval
          ? await scoreRetrievalAccuracy(
              ev.query,
              chunkContents.map((content) => ({ content })),
              llmProvider
            )
          : existingScores;

        const groundednessScore = needsGroundedness
          ? await scoreGroundedness(ev.answer, chunkContents, llmProvider)
          : ev.groundednessScore;

        await prisma.evaluation.update({
          where: { id: ev.id },
          data: {
            retrievalScores,
            groundednessScore,
          },
        });
        updated++;
      } catch (err) {
        failed++;
        console.error("Backfill failed for evaluation", ev.id, err);
      }
    }

    const remaining = await prisma.evaluation.count({ where });

    return NextResponse.json({
      scanned: evaluations.length,
      updated,
      failed,
      pendingBefore,
      remaining,
      done: remaining === 0,
      limit,
      days,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Backfill error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
