import { NextRequest, NextResponse } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractFromPdf } from "@/lib/services/extraction/pdf-extractor";
import { extractFromWord } from "@/lib/services/extraction/word-extractor";
import { extractFromMarkdown } from "@/lib/services/extraction/markdown-extractor";
import { extractFromText } from "@/lib/services/extraction/text-extractor";
import { processSource } from "@/lib/services/processing/processing-queue";
import { createOpenAIEmbeddingProvider } from "@/lib/services/embedding/provider-factory";
import { checkIngestionRateLimit } from "@/lib/rate-limit";
type SourceType = "PDF" | "WORD" | "MARKDOWN" | "TEXT";

const FILE_LIMITS: Record<string, { maxSize: number; sourceType: SourceType }> = {
  "application/pdf": { maxSize: 20 * 1024 * 1024, sourceType: "PDF" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    maxSize: 20 * 1024 * 1024,
    sourceType: "WORD",
  },
  "application/msword": { maxSize: 20 * 1024 * 1024, sourceType: "WORD" },
  "text/markdown": { maxSize: 10 * 1024 * 1024, sourceType: "MARKDOWN" },
  "text/plain": { maxSize: 10 * 1024 * 1024, sourceType: "TEXT" },
};

const EXTENSION_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".txt": "text/plain",
};

function getContentType(file: File): string {
  // Prefer extension-based detection as browser MIME types can be unreliable
  const name = file.name.toLowerCase();
  for (const [ext, mime] of Object.entries(EXTENSION_MAP)) {
    if (name.endsWith(ext)) return mime;
  }
  return file.type;
}

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const contentType = getContentType(file);
    const fileConfig = FILE_LIMITS[contentType];

    if (!fileConfig) {
      return NextResponse.json(
        {
          error: `Unsupported file format. Accepted formats: PDF, Word (.doc, .docx), Markdown (.md), Text (.txt)`,
        },
        { status: 400 }
      );
    }

    if (file.size > fileConfig.maxSize) {
      const maxMB = fileConfig.maxSize / (1024 * 1024);
      return NextResponse.json(
        { error: `File exceeds the ${maxMB}MB size limit` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let title: string;
    let content: string;
    let author: string | undefined;

    try {
      switch (fileConfig.sourceType) {
        case "PDF": {
          const result = await extractFromPdf(buffer, file.name);
          title = result.title;
          content = result.content;
          author = result.author;
          break;
        }
        case "WORD": {
          const result = await extractFromWord(buffer, file.name);
          title = result.title;
          content = result.content;
          author = result.author;
          break;
        }
        case "MARKDOWN": {
          const text = buffer.toString("utf-8");
          const result = extractFromMarkdown(text, file.name);
          title = result.title;
          content = result.content;
          break;
        }
        case "TEXT": {
          const text = buffer.toString("utf-8");
          const result = extractFromText(text, file.name);
          title = result.title;
          content = result.content;
          break;
        }
        default:
          return NextResponse.json(
            { error: "Unsupported file type" },
            { status: 400 }
          );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown extraction error";
      return NextResponse.json(
        {
          error: `Failed to extract content from the document. It may be corrupted or password-protected. Details: ${message}`,
        },
        { status: 422 }
      );
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "No text content could be extracted from this document" },
        { status: 422 }
      );
    }

    const source = await prisma.source.create({
      data: {
        userId,
        title,
        sourceType: fileConfig.sourceType,
        author,
        content,
        metadata: { originalFilename: file.name, fileSize: file.size },
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
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
