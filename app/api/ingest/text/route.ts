import { NextRequest, NextResponse } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processSource } from "@/lib/services/processing/processing-queue";
import { OpenAIEmbeddingProvider } from "@/lib/services/embedding/embedding-service";
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
    const { text, title, sourceUrl } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text content is required" },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();
    const derivedTitle =
      title?.trim() ||
      trimmedText.split("\n")[0].slice(0, 100) ||
      "Untitled Text";

    const source = await prisma.source.create({
      data: {
        userId,
        title: derivedTitle,
        sourceType: "TEXT",
        sourceUrl: sourceUrl?.trim() || null,
        content: trimmedText,
        metadata: {},
      },
    });

    // Trigger processing asynchronously
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });
    const apiKey = settings?.openaiApiKey || process.env.OPENAI_API_KEY || "";
    const embeddingProvider = new OpenAIEmbeddingProvider(apiKey);

    processSource(source.id, { embeddingProvider }).catch((err) =>
      console.error("Processing failed for source", source.id, err)
    );

    return NextResponse.json({
      source: {
        id: source.id,
        title: source.title,
        status: source.status,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Text ingestion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
