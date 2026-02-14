import { prisma } from "@/lib/db";

export interface KeywordSearchResult {
  chunkId: string;
  sourceId: string;
  content: string;
  chunkIndex: number;
  score: number;
}

export async function keywordSearch(
  query: string,
  userId: string,
  topK: number = 20
): Promise<KeywordSearchResult[]> {
  const results = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      sourceId: string;
      content: string;
      chunkIndex: number;
      rank: number;
    }>
  >(
    `SELECT
       c.id,
       c."sourceId",
       c.content,
       c."chunkIndex",
       ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', $1)) AS rank
     FROM chunks c
     JOIN sources s ON s.id = c."sourceId"
     WHERE c."userId" = $2
       AND s.status = 'READY'
       AND to_tsvector('english', c.content) @@ plainto_tsquery('english', $1)
     ORDER BY rank DESC
     LIMIT $3`,
    query,
    userId,
    topK
  );

  return results.map((r: { id: string; sourceId: string; content: string; chunkIndex: number; rank: number }) => ({
    chunkId: r.id,
    sourceId: r.sourceId,
    content: r.content,
    chunkIndex: r.chunkIndex,
    score: Number(r.rank),
  }));
}
