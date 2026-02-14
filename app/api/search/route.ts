import { NextRequest, NextResponse } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hybridSearch } from "@/lib/services/search/hybrid-search";
import { createOpenAIEmbeddingProvider } from "@/lib/services/embedding/provider-factory";
import { checkQueryRateLimit } from "@/lib/rate-limit";

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

    const results = await hybridSearch(query.trim(), userId, embeddingProvider, 10);

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

    const enrichedResults = results.map((r) => {
      const source = sourceMap.get(r.sourceId);
      // Create a snippet - first 200 chars of chunk content
      const snippet =
        r.content.length > 200
          ? r.content.slice(0, 200) + "..."
          : r.content;

      return {
        chunkId: r.chunkId,
        sourceId: r.sourceId,
        chunkIndex: r.chunkIndex,
        content: r.content,
        snippet,
        score: r.score,
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
