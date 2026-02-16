import { NextRequest } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hybridSearch } from "@/lib/services/search/hybrid-search";
import { createLLMProvider } from "@/lib/services/llm/provider-factory";
import { decrypt } from "@/lib/services/encryption";
import { calculateCost } from "@/lib/services/evaluation/cost-tracker";
import { scoreGroundedness } from "@/lib/services/evaluation/groundedness";
import { scoreRetrievalAccuracy } from "@/lib/services/evaluation/retrieval-accuracy";
import { checkQueryRateLimit } from "@/lib/rate-limit";
import {
  createOpenAIEmbeddingProvider,
  resolveOpenAIApiKey,
} from "@/lib/services/embedding/provider-factory";
import { buildThreadTitle } from "@/lib/services/qa/chat-history";

const SOURCE_CONTEXT_CHUNK_LIMIT = 3;

interface QARequestBody {
  question?: string;
  threadId?: string;
}

async function resolveThreadId(
  userId: string,
  question: string,
  threadId?: string
): Promise<string | null> {
  if (threadId && threadId.trim().length > 0) {
    const existing = await prisma.chatThread.findFirst({
      where: { id: threadId.trim(), userId },
      select: { id: true },
    });

    return existing?.id || null;
  }

  const thread = await prisma.chatThread.create({
    data: {
      userId,
      title: buildThreadTitle(question),
    },
    select: { id: true },
  });

  return thread.id;
}

function runBackgroundEvaluationScoring(params: {
  evaluationId: string;
  query: string;
  answer: string;
  chunkContents: string[];
  citedPassages: string[];
  llmProvider: ReturnType<typeof createLLMProvider>;
}) {
  const {
    evaluationId,
    query,
    answer,
    chunkContents,
    citedPassages,
    llmProvider,
  } = params;

  void (async () => {
    try {
      const retrievalScores = await scoreRetrievalAccuracy(
        query,
        chunkContents.map((content) => ({ content })),
        llmProvider
      );
      const groundednessScore = await scoreGroundedness(
        answer,
        citedPassages,
        llmProvider
      );

      await prisma.evaluation.update({
        where: { id: evaluationId },
        data: {
          retrievalScores,
          groundednessScore,
        },
      });
    } catch (err) {
      console.error("Failed to score evaluation:", err);
    }
  })();
}

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredAuthSession();
    const userId = session.user!.id;

    const rateLimit = checkQueryRateLimit(userId);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ error: rateLimit.message }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: QARequestBody = {};
    try {
      body = (await request.json()) as QARequestBody;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const question = body.question?.trim();
    if (!question) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const resolvedThreadId = await resolveThreadId(userId, question, body.threadId);
    if (!resolvedThreadId) {
      return new Response(JSON.stringify({ error: "Thread not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await prisma.chatMessage.create({
      data: {
        threadId: resolvedThreadId,
        userId,
        role: "USER",
        content: question,
      },
    });

    await prisma.chatThread.update({
      where: { id: resolvedThreadId },
      data: { updatedAt: new Date() },
    });

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    const embeddingApiKey = resolveOpenAIApiKey(settings);
    const embeddingProvider = createOpenAIEmbeddingProvider(settings);

    const startTime = Date.now();
    const searchResults = await hybridSearch(question, userId, embeddingProvider, 10);

    if (searchResults.length === 0) {
      const fallbackAnswer =
        "I couldn't find relevant sources to answer this question. Try adding more sources or rephrasing your question.";

      const assistantMessage = await prisma.chatMessage.create({
        data: {
          threadId: resolvedThreadId,
          userId,
          role: "ASSISTANT",
          content: fallbackAnswer,
          noContext: true,
          citations: [],
        },
        select: { id: true },
      });

      await prisma.chatThread.update({
        where: { id: resolvedThreadId },
        data: { updatedAt: new Date() },
      });

      return new Response(
        JSON.stringify({
          answer: fallbackAnswer,
          citations: [],
          noContext: true,
          threadId: resolvedThreadId,
          assistantMessageId: assistantMessage.id,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const sourceIds = [...new Set(searchResults.map((r) => r.sourceId))];
    const sources = await prisma.source.findMany({
      where: { id: { in: sourceIds }, userId },
      select: {
        id: true,
        title: true,
        author: true,
        sourceType: true,
        sourceUrl: true,
      },
    });

    const sourceMap = new Map(
      sources.map(
        (s: {
          id: string;
          title: string;
          author: string | null;
          sourceType: string;
          sourceUrl: string | null;
        }) => [s.id, s]
      )
    );

    const sourceGroups = new Map<string, Array<(typeof searchResults)[number]>>();
    for (const result of searchResults) {
      if (!sourceGroups.has(result.sourceId)) {
        sourceGroups.set(result.sourceId, []);
      }
      sourceGroups.get(result.sourceId)!.push(result);
    }

    const sourceLevelResults = Array.from(sourceGroups.entries()).map(
      ([sourceId, results]) => ({
        sourceId,
        results,
        source: sourceMap.get(sourceId) || null,
      })
    );

    const citations = sourceLevelResults.map((item, i) => {
      const contextChunks = item.results.slice(0, SOURCE_CONTEXT_CHUNK_LIMIT);
      const [primaryChunk] = item.results;
      return {
        index: i + 1,
        chunkId: primaryChunk.chunkId,
        sourceId: item.sourceId,
        chunkIndex: primaryChunk.chunkIndex,
        content: contextChunks.map((chunk) => chunk.content).join("\n\n"),
        source: item.source,
        passageCount: item.results.length,
      };
    });

    const provider = settings?.defaultProvider || "OPENAI";
    const model = settings?.defaultModel || "gpt-5-mini";
    let llmApiKey: string;

    if (provider === "ANTHROPIC") {
      llmApiKey =
        (settings?.anthropicApiKey ? decrypt(settings.anthropicApiKey) : null) ||
        process.env.ANTHROPIC_API_KEY ||
        "";
    } else {
      llmApiKey = embeddingApiKey;
    }

    if (!llmApiKey) {
      return new Response(
        JSON.stringify({
          error: `No API key configured for ${provider}. Please add your API key in Settings.`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const llmProvider = createLLMProvider(provider, model, llmApiKey);

    const contextTexts = citations.map((citation) => {
      const source = citation.source;
      const metadataLines = [
        `Source title: ${source?.title || "Unknown"}`,
        source?.author ? `Source author: ${source.author}` : null,
        source?.sourceType ? `Source type: ${source.sourceType}` : null,
        source?.sourceUrl ? `Source URL: ${source.sourceUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      return `${metadataLines}\n\nRelevant passages:\n${citation.content}`;
    });

    const { stream, getUsage } = await llmProvider.generateAnswer(question, contextTexts);

    const encoder = new TextEncoder();
    let fullAnswer = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "citations", citations })}\n\n`
            )
          );

          for await (const token of stream) {
            fullAnswer += token;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "token", content: token })}\n\n`
              )
            );
          }

          const latencyMs = Date.now() - startTime;
          const usage = getUsage();

          const costUsd = usage
            ? calculateCost(model, usage.promptTokens, usage.completionTokens)
            : 0;

          let evaluationId: string | null = null;
          let assistantMessageId: string | null = null;

          try {
            const assistantMessage = await prisma.chatMessage.create({
              data: {
                threadId: resolvedThreadId,
                userId,
                role: "ASSISTANT",
                content: fullAnswer,
                noContext: false,
                citations,
              },
              select: { id: true },
            });

            assistantMessageId = assistantMessage.id;

            const evaluation = await prisma.evaluation.create({
              data: {
                userId,
                assistantMessageId,
                llmProvider: provider,
                llmModel: model,
                query: question,
                retrievedChunkIds: searchResults.map((r) => r.chunkId),
                answer: fullAnswer,
                latencyMs,
                tokenUsage: usage
                  ? {
                      prompt_tokens: usage.promptTokens,
                      completion_tokens: usage.completionTokens,
                    }
                  : {},
                costUsd,
              },
            });
            evaluationId = evaluation.id;

            runBackgroundEvaluationScoring({
              evaluationId,
              query: question,
              answer: fullAnswer,
              chunkContents: searchResults.map((r) => r.content),
              citedPassages: citations.map((citation) => citation.content),
              llmProvider,
            });

            await prisma.chatThread.update({
              where: { id: resolvedThreadId },
              data: { updatedAt: new Date() },
            });
          } catch (err) {
            console.error("Failed to persist chat history or evaluation:", err);
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                latencyMs,
                usage,
                evaluationId,
                threadId: resolvedThreadId,
                assistantMessageId,
              })}\n\n`
            )
          );

          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: err instanceof Error ? err.message : "Generation failed",
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Q&A error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
