import { semanticSearch } from "./semantic-search";
import { keywordSearch } from "./keyword-search";
import { EmbeddingProvider } from "@/lib/services/embedding/embedding-service";

export interface HybridSearchResult {
  chunkId: string;
  sourceId: string;
  content: string;
  chunkIndex: number;
  score: number;
}

/**
 * Reciprocal Rank Fusion (RRF) combines ranked lists from semantic and keyword search.
 * RRF score for document d = sum(1 / (k + rank_i(d))) for each ranking i
 * where k=60 is the standard smoothing parameter.
 */
export function reciprocalRankFusion(
  semanticResults: Array<{ chunkId: string; sourceId: string; content: string; chunkIndex: number }>,
  keywordResults: Array<{ chunkId: string; sourceId: string; content: string; chunkIndex: number }>,
  k: number = 60,
  topN: number = 10
): HybridSearchResult[] {
  const scoreMap = new Map<
    string,
    { sourceId: string; content: string; chunkIndex: number; score: number }
  >();

  // Score from semantic results
  for (let rank = 0; rank < semanticResults.length; rank++) {
    const result = semanticResults[rank];
    const rrfScore = 1 / (k + rank + 1); // rank is 0-based, RRF expects 1-based
    scoreMap.set(result.chunkId, {
      sourceId: result.sourceId,
      content: result.content,
      chunkIndex: result.chunkIndex,
      score: rrfScore,
    });
  }

  // Score from keyword results
  for (let rank = 0; rank < keywordResults.length; rank++) {
    const result = keywordResults[rank];
    const rrfScore = 1 / (k + rank + 1);
    const existing = scoreMap.get(result.chunkId);
    if (existing) {
      existing.score += rrfScore;
    } else {
      scoreMap.set(result.chunkId, {
        sourceId: result.sourceId,
        content: result.content,
        chunkIndex: result.chunkIndex,
        score: rrfScore,
      });
    }
  }

  // Sort by combined score and return top N
  return Array.from(scoreMap.entries())
    .map(([chunkId, data]) => ({ chunkId, ...data }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

export async function hybridSearch(
  query: string,
  userId: string,
  embeddingProvider: EmbeddingProvider | null,
  topN: number = 10
): Promise<HybridSearchResult[]> {
  const keywordResults = await keywordSearch(query, userId, 20);

  if (!embeddingProvider) {
    return reciprocalRankFusion([], keywordResults, 60, topN);
  }

  const semanticResults = await semanticSearch(query, userId, embeddingProvider, 20);

  return reciprocalRankFusion(semanticResults, keywordResults, 60, topN);
}
