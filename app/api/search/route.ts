import { NextRequest, NextResponse } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hybridSearch } from "@/lib/services/search/hybrid-search";
import { createOpenAIEmbeddingProvider } from "@/lib/services/embedding/provider-factory";
import { checkQueryRateLimit } from "@/lib/rate-limit";

const SOURCE_RESULT_LIMIT = 10;
const CHUNK_RESULT_FETCH_LIMIT = 40;
const SNIPPET_LENGTH = 200;

export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredAuthSession();
    const userId = session.user!.id;

    // Check rate limit
    const rateLimit = checkQueryRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.message },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });
    const embeddingProvider = createOpenAIEmbeddingProvider(settings);

    const results = await hybridSearch(
      query.trim(),
      userId,
      embeddingProvider,
      CHUNK_RESULT_FETCH_LIMIT
    );

    // Fetch source metadata for results
    const sourceIds = [...new Set(results.map((r) => r.sourceId))];
    const sources = await prisma.source.findMany({
      where: { id: { in: sourceIds }, userId },
      select: {
        id: true,
        title: true,
        sourceType: true,
        sourceUrl: true,
        author: true,
        captureDate: true,
      },
    });

    const sourceMap = new Map(sources.map((s: typeof sources[number]) => [s.id, s]));

    const groupedBySource = new Map<
      string,
      {
        chunkId: string;
        sourceId: string;
        chunkIndex: number;
        content: string;
        score: number;
        matchCount: number;
      }
    >();

    for (const result of results) {
      const existing = groupedBySource.get(result.sourceId);
      if (!existing) {
        groupedBySource.set(result.sourceId, {
          chunkId: result.chunkId,
          sourceId: result.sourceId,
          chunkIndex: result.chunkIndex,
          content: result.content,
          score: result.score,
          matchCount: 1,
        });
        continue;
      }

      existing.matchCount += 1;
      if (result.score > existing.score) {
        existing.chunkId = result.chunkId;
        existing.chunkIndex = result.chunkIndex;
        existing.content = result.content;
        existing.score = result.score;
      }
    }

    const enrichedResults = Array.from(groupedBySource.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, SOURCE_RESULT_LIMIT)
      .map((result) => {
        const source = sourceMap.get(result.sourceId);
        const snippet =
          result.content.length > SNIPPET_LENGTH
            ? result.content.slice(0, SNIPPET_LENGTH) + "..."
            : result.content;

        return {
          sourceId: result.sourceId,
          chunkId: result.chunkId,
          chunkIndex: result.chunkIndex,
          snippet,
          score: result.score,
          matchCount: result.matchCount,
          source: source || null,
        };
      });

    return NextResponse.json({ results: enrichedResults, query: query.trim() });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
