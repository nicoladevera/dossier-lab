import { processSource } from "./processing-queue";
import type { EmbeddingProvider } from "@/lib/services/embedding/embedding-service";
import type { ChunkingStrategy } from "@/lib/services/chunking/chunking-service";

// Mock prisma
jest.mock("@/lib/db", () => ({
  prisma: {
    source: {
      update: jest.fn().mockResolvedValue({}),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: "source-1",
        userId: "user-1",
        content: "This is test content that should be chunked and embedded for processing.",
      }),
    },
    $executeRawUnsafe: jest.fn().mockResolvedValue(1),
  },
}));

const { prisma } = jest.requireMock("@/lib/db");

describe("processSource", () => {
  const mockEmbeddingProvider: EmbeddingProvider = {
    modelId: "test-model",
    dimensions: 1536,
    embed: jest.fn().mockResolvedValue([Array(1536).fill(0.1)]),
  };

  const mockChunkingStrategy: ChunkingStrategy = {
    chunk: jest.fn().mockReturnValue(["chunk 1"]),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update source status to PROCESSING at start", async () => {
    await processSource("source-1", {
      embeddingProvider: mockEmbeddingProvider,
      chunkingStrategy: mockChunkingStrategy,
    });

    expect(prisma.source.update).toHaveBeenCalledWith({
      where: { id: "source-1" },
      data: { status: "PROCESSING", processingProgress: 0 },
    });
  });

  it("should chunk content and generate embeddings", async () => {
    await processSource("source-1", {
      embeddingProvider: mockEmbeddingProvider,
      chunkingStrategy: mockChunkingStrategy,
    });

    expect(mockChunkingStrategy.chunk).toHaveBeenCalled();
    expect(mockEmbeddingProvider.embed).toHaveBeenCalledWith(["chunk 1"]);
  });

  it("should store chunks via raw SQL", async () => {
    await processSource("source-1", {
      embeddingProvider: mockEmbeddingProvider,
      chunkingStrategy: mockChunkingStrategy,
    });

    expect(prisma.$executeRawUnsafe).toHaveBeenCalled();
  });

  it("should update status to READY on success", async () => {
    await processSource("source-1", {
      embeddingProvider: mockEmbeddingProvider,
      chunkingStrategy: mockChunkingStrategy,
    });

    expect(prisma.source.update).toHaveBeenCalledWith({
      where: { id: "source-1" },
      data: { status: "READY", processingProgress: 100 },
    });
  });

  it("should update status to ERROR on failure", async () => {
    const failingProvider: EmbeddingProvider = {
      modelId: "test-model",
      dimensions: 1536,
      embed: jest.fn().mockRejectedValue(new Error("API failed")),
    };

    await expect(
      processSource("source-1", {
        embeddingProvider: failingProvider,
        chunkingStrategy: mockChunkingStrategy,
      })
    ).rejects.toThrow("API failed");

    expect(prisma.source.update).toHaveBeenCalledWith({
      where: { id: "source-1" },
      data: {
        status: "ERROR",
        metadata: { error: "API failed" },
      },
    });
  });

  it("should handle empty content gracefully", async () => {
    const emptyChunker: ChunkingStrategy = {
      chunk: jest.fn().mockReturnValue([]),
    };

    await processSource("source-1", {
      embeddingProvider: mockEmbeddingProvider,
      chunkingStrategy: emptyChunker,
    });

    expect(mockEmbeddingProvider.embed).not.toHaveBeenCalled();
    expect(prisma.source.update).toHaveBeenCalledWith({
      where: { id: "source-1" },
      data: { status: "READY", processingProgress: 100 },
    });
  });

  it("should update progress during processing", async () => {
    await processSource("source-1", {
      embeddingProvider: mockEmbeddingProvider,
      chunkingStrategy: mockChunkingStrategy,
    });

    const progressCalls = (prisma.source.update as jest.Mock).mock.calls.filter(
      (call: [{ data: { processingProgress?: number } }]) => call[0].data.processingProgress !== undefined
    );
    const progressValues = progressCalls.map(
      (call: [{ data: { processingProgress: number } }]) => call[0].data.processingProgress
    );

    expect(progressValues).toContain(0);
    expect(progressValues).toContain(30);
    expect(progressValues).toContain(70);
    expect(progressValues).toContain(100);
  });
});
