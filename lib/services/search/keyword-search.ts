import { prisma } from "@/lib/db";

export interface KeywordSearchResult {
  chunkId: string;
  sourceId: string;
  content: string;
  chunkIndex: number;
  score: number;
}

const MAX_FALLBACK_TERMS = 8;
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "did",
  "do",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "say",
  "said",
  "the",
  "to",
  "was",
  "what",
  "when",
  "where",
  "who",
  "why",
  "with",
]);

function normalizeKeywordTerms(query: string): string[] {
  const terms = query.toLowerCase().match(/[a-z0-9]+/g) || [];
  const unique = new Set<string>();

  for (const term of terms) {
    if (term.length < 2 || STOP_WORDS.has(term)) {
      continue;
    }

    unique.add(term);

    // Basic singularization helps recover matches like implication/implications.
    if (term.endsWith("s") && term.length > 4) {
      unique.add(term.slice(0, -1));
    }
  }

  return Array.from(unique).slice(0, MAX_FALLBACK_TERMS);
}

function mapKeywordResults(
  results: Array<{
    id: string;
    sourceId: string;
    content: string;
    chunkIndex: number;
    rank: number;
  }>
): KeywordSearchResult[] {
  return results.map((r) => ({
    chunkId: r.id,
    sourceId: r.sourceId,
    content: r.content,
    chunkIndex: r.chunkIndex,
    score: Number(r.rank),
  }));
}

export async function keywordSearch(
  query: string,
  userId: string,
  topK: number = 20
): Promise<KeywordSearchResult[]> {
  // First pass: strict full-text search with stemming over chunk + source metadata.
  const strictResults = await prisma.$queryRawUnsafe<
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
       ts_rank(
         to_tsvector(
           'english',
           c.content || ' ' || coalesce(s.title, '') || ' ' || coalesce(s.author, '') || ' ' || coalesce(s."sourceUrl", '')
         ),
         plainto_tsquery('english', $1)
       ) AS rank
     FROM chunks c
     JOIN sources s ON s.id = c."sourceId"
     WHERE c."userId" = $2
       AND s.status = 'READY'
       AND to_tsvector(
         'english',
         c.content || ' ' || coalesce(s.title, '') || ' ' || coalesce(s.author, '') || ' ' || coalesce(s."sourceUrl", '')
       ) @@ plainto_tsquery('english', $1)
     ORDER BY rank DESC
     LIMIT $3`,
    query,
    userId,
    topK
  );

  if (strictResults.length > 0) {
    return mapKeywordResults(strictResults);
  }

  // Fallback: loose term matching with OR semantics.
  const terms = normalizeKeywordTerms(query);
  if (terms.length === 0) {
    return [];
  }

  const termPatterns = terms.map((term) => `\\m${term}\\M`);
  const termStartIndex = 3;

  const matchExpression = termPatterns
    .map((_, i) => {
      const p = termStartIndex + i;
      return `(
        lower(c.content) ~ $${p}
        OR lower(coalesce(s.title, '')) ~ $${p}
        OR lower(coalesce(s.author, '')) ~ $${p}
        OR lower(coalesce(s."sourceUrl", '')) ~ $${p}
      )`;
    })
    .join(" OR ");

  const scoreExpression = termPatterns
    .map((_, i) => {
      const p = termStartIndex + i;
      return `(
        CASE WHEN lower(c.content) ~ $${p} THEN 3 ELSE 0 END +
        CASE WHEN lower(coalesce(s.title, '')) ~ $${p} THEN 4 ELSE 0 END +
        CASE WHEN lower(coalesce(s.author, '')) ~ $${p} THEN 5 ELSE 0 END +
        CASE WHEN lower(coalesce(s."sourceUrl", '')) ~ $${p} THEN 2 ELSE 0 END
      )`;
    })
    .join(" + ");

  const looseResults = await prisma.$queryRawUnsafe<
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
       (${scoreExpression})::float AS rank
     FROM chunks c
     JOIN sources s ON s.id = c."sourceId"
     WHERE c."userId" = $1
       AND s.status = 'READY'
       AND (${matchExpression})
     ORDER BY rank DESC, c."chunkIndex" ASC
     LIMIT $2`,
    userId,
    topK,
    ...termPatterns
  );

  return mapKeywordResults(looseResults);
}
