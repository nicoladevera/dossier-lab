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

const SOURCE_CONTEXT_CHUNK_LIMIT = 3;

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

    // Check rate limit
    const rateLimit = checkQueryRateLimit(userId);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimit.message }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const { question } = await request.json();

    if (!question || question.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get user settings for API keys and provider preferences
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    const embeddingApiKey = resolveOpenAIApiKey(settings);
    const embeddingProvider = createOpenAIEmbeddingProvider(settings);

    // Retrieve relevant chunks
    const startTime = Date.now();
    const searchResults = await hybridSearch(
      question.trim(),
      userId,
      embeddingProvider,
      10
    );

    if (searchResults.length === 0) {
      return new Response(
        JSON.stringify({
          answer:
            "I couldn't find relevant sources to answer this question. Try adding more sources or rephrasing your question.",
          citations: [],
          noContext: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get source metadata for citations
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

    // Group retrieval results by source so citations are source-level.
    const sourceGroups = new Map<
      string,
      Array<(typeof searchResults)[number]>
    >();
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

    // Get the appropriate LLM provider
    const provider = settings?.defaultProvider || "OPENAI";
    const model = settings?.defaultModel || "gpt-5-mini";
    let llmApiKey: string;

    if (provider === "ANTHROPIC") {
      llmApiKey =
        (settings?.anthropicApiKey
          ? decrypt(settings.anthropicApiKey)
          : null) ||
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

    // Generate answer with streaming
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
    const { stream, getUsage } = await llmProvider.generateAnswer(
      question.trim(),
      contextTexts
    );

    // Create a ReadableStream for the response
    const encoder = new TextEncoder();
    let fullAnswer = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send citations first as a JSON event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "citations", citations })}\n\n`
            )
          );

          // Stream the answer
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

          // Calculate cost
          const costUsd = usage
            ? calculateCost(model, usage.promptTokens, usage.completionTokens)
            : 0;

          let evaluationId: string | null = null;
          try {
            const evaluation = await prisma.evaluation.create({
              data: {
                userId,
                query: question.trim(),
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
              query: question.trim(),
              answer: fullAnswer,
              chunkContents: searchResults.map((r) => r.content),
              citedPassages: citations.map((citation) => citation.content),
              llmProvider,
            });
          } catch (err) {
            console.error("Failed to log evaluation:", err);
          }

          // Send completion event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                latencyMs,
                usage,
                evaluationId,
              })}\n\n`
            )
          );

          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message:
                  err instanceof Error ? err.message : "Generation failed",
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
