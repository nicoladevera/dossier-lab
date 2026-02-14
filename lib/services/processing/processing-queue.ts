import { prisma } from "@/lib/db";
import { ChunkingStrategy, RecursiveCharacterSplitter } from "@/lib/services/chunking/chunking-service";
import { EmbeddingProvider } from "@/lib/services/embedding/embedding-service";

export interface ProcessingOptions {
  chunkingStrategy?: ChunkingStrategy;
  embeddingProvider?: EmbeddingProvider | null;
}

export async function processSource(sourceId: string, options: ProcessingOptions): Promise<void> {
  const chunkingStrategy = options.chunkingStrategy ?? new RecursiveCharacterSplitter();

  try {
    // Update status to PROCESSING
    await prisma.source.update({
      where: { id: sourceId },
      data: { status: "PROCESSING", processingProgress: 0 },
    });

    // Fetch source content
    const source = await prisma.source.findUniqueOrThrow({
      where: { id: sourceId },
      select: { id: true, userId: true, content: true },
    });

    // Chunk the content
    const chunks = chunkingStrategy.chunk(source.content);

    if (chunks.length === 0) {
      await prisma.source.update({
        where: { id: sourceId },
        data: { status: "READY", processingProgress: 100 },
      });
      return;
    }

    await prisma.source.update({
      where: { id: sourceId },
      data: { processingProgress: 30 },
    });

    // Generate embeddings when a provider is configured.
    let embeddings: number[][] | null = null;
    if (options.embeddingProvider) {
      embeddings = await options.embeddingProvider.embed(chunks);

      if (embeddings.length !== chunks.length) {
        throw new Error(
          `Embedding count mismatch: expected ${chunks.length}, got ${embeddings.length}`
        );
      }
    }

    await prisma.source.update({
      where: { id: sourceId },
      data: { processingProgress: 70 },
    });

    // Store chunks with embeddings using raw SQL for vector type
    for (let i = 0; i < chunks.length; i++) {
      const embedding = embeddings ? embeddings[i] : null;
      const embeddingArray = embedding ? `[${embedding.join(",")}]` : null;
      const embeddingModel =
        embedding && options.embeddingProvider
          ? options.embeddingProvider.modelId
          : null;

      await prisma.$executeRawUnsafe(
        `INSERT INTO chunks (id, "sourceId", "userId", content, "chunkIndex", embedding, "embeddingModel", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::vector, $6, NOW())`,
        source.id,
        source.userId,
        chunks[i],
        i,
        embeddingArray,
        embeddingModel
      );
    }

    // Update status to READY
    await prisma.source.update({
      where: { id: sourceId },
      data: { status: "READY", processingProgress: 100 },
    });
  } catch (error) {
    // Update status to ERROR
    await prisma.source.update({
      where: { id: sourceId },
      data: {
        status: "ERROR",
        metadata: { error: error instanceof Error ? error.message : "Unknown error" },
      },
    });
    throw error;
  }
}
