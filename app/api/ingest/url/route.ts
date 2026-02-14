import { NextRequest, NextResponse } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractFromUrl } from "@/lib/services/extraction/url-extractor";
import { processSource } from "@/lib/services/processing/processing-queue";
import { createOpenAIEmbeddingProvider } from "@/lib/services/embedding/provider-factory";
import { checkIngestionRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredAuthSession();
    const userId = session.user!.id;

    // Check rate limit
    const rateLimit = checkIngestionRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.message },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    const result = await extractFromUrl(url);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    if (!result.data) {
      return NextResponse.json(
        { error: "Failed to extract content" },
        { status: 422 }
      );
    }

    // Save source to database
    const source = await prisma.source.create({
      data: {
        userId,
        title: result.data.title,
        sourceType: "URL",
        sourceUrl: url,
        author: result.data.author,
        content: result.data.content,
        metadata: {
          excerpt: result.data.excerpt,
          siteName: result.data.siteName,
          warning: result.warning,
        },
      },
    });

    // Trigger processing asynchronously
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });
    const embeddingProvider = createOpenAIEmbeddingProvider(settings);

    processSource(source.id, { embeddingProvider }).catch((err) =>
      console.error("Processing failed for source", source.id, err)
    );

    return NextResponse.json({
      source: {
        id: source.id,
        title: source.title,
        status: source.status,
      },
      warning: result.warning,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("URL ingestion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
