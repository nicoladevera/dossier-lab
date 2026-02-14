import { NextRequest } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hybridSearch } from "@/lib/services/search/hybrid-search";
import { OpenAIEmbeddingProvider } from "@/lib/services/embedding/embedding-service";
import { createLLMProvider } from "@/lib/services/llm/provider-factory";
import { decrypt } from "@/lib/services/encryption";
import { calculateCost } from "@/lib/services/evaluation/cost-tracker";
import { checkQueryRateLimit } from "@/lib/rate-limit";

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

    const embeddingApiKey =
      (settings?.openaiApiKey ? decrypt(settings.openaiApiKey) : null) ||
      process.env.OPENAI_API_KEY ||
      "";

    const embeddingProvider = new OpenAIEmbeddingProvider(embeddingApiKey);

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
        sourceType: true,
        sourceUrl: true,
      },
    });
    const sourceMap = new Map(sources.map((s: { id: string; title: string; sourceType: string; sourceUrl: string | null }) => [s.id, s]));

    // Build citations metadata
    const citations = searchResults.map((r, i) => ({
      index: i + 1,
      chunkId: r.chunkId,
      sourceId: r.sourceId,
      chunkIndex: r.chunkIndex,
      content: r.content,
      source: sourceMap.get(r.sourceId) || null,
    }));

    // Get the appropriate LLM provider
    const provider = settings?.defaultProvider || "OPENAI";
    const model = settings?.defaultModel || "gpt-4o";
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
    const contextTexts = searchResults.map((r) => r.content);
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

          // Send completion event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                latencyMs,
                usage,
              })}\n\n`
            )
          );

          // Calculate cost
          const costUsd = usage
            ? calculateCost(model, usage.promptTokens, usage.completionTokens)
            : 0;

          // Log the Q&A interaction asynchronously
          prisma.evaluation
            .create({
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
            })
            .catch((err: unknown) =>
              console.error("Failed to log evaluation:", err)
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
