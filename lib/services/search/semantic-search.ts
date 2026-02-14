import { prisma } from "@/lib/db";
import { EmbeddingProvider } from "@/lib/services/embedding/embedding-service";

export interface SearchResult {
  chunkId: string;
  sourceId: string;
  content: string;
  chunkIndex: number;
  score: number;
}

export async function semanticSearch(
  query: string,
  userId: string,
  embeddingProvider: EmbeddingProvider,
  topK: number = 20
): Promise<SearchResult[]> {
  const [queryEmbedding] = await embeddingProvider.embed([query]);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  const results = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      sourceId: string;
      content: string;
      chunkIndex: number;
      similarity: number;
    }>
  >(
    `SELECT
       c.id,
       c."sourceId",
       c.content,
       c."chunkIndex",
       1 - (c.embedding <=> $1::vector) AS similarity
     FROM chunks c
     JOIN sources s ON s.id = c."sourceId"
     WHERE c."userId" = $2
       AND s.status = 'READY'
       AND c.embedding IS NOT NULL
     ORDER BY c.embedding <=> $1::vector
     LIMIT $3`,
    embeddingStr,
    userId,
    topK
  );

  return results.map((r: { id: string; sourceId: string; content: string; chunkIndex: number; similarity: number }) => ({
    chunkId: r.id,
    sourceId: r.sourceId,
    content: r.content,
    chunkIndex: r.chunkIndex,
    score: Number(r.similarity),
  }));
}
