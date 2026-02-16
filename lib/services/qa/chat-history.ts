const MAX_THREAD_TITLE_LENGTH = 80;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const DEFAULT_THREAD_TITLE = "Untitled chat";

export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface Pagination {
  page: number;
  limit: number;
}

export interface LegacyEvaluationRecord {
  query: string;
  answer: string;
  createdAt: Date;
}

export interface LegacyBackfillPayload {
  title: string;
  userContent: string;
  assistantContent: string;
  createdAt: Date;
}

export function buildThreadTitle(question: string): string {
  const normalized = question.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return DEFAULT_THREAD_TITLE;
  }
  if (normalized.length <= MAX_THREAD_TITLE_LENGTH) {
    return normalized;
  }
  return normalized.slice(0, MAX_THREAD_TITLE_LENGTH).trimEnd();
}

export function clampPagination(input: PaginationInput): Pagination {
  const page =
    typeof input.page === "number" && Number.isFinite(input.page)
      ? Math.max(1, Math.floor(input.page))
      : 1;

  const limit =
    typeof input.limit === "number" && Number.isFinite(input.limit)
      ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(input.limit)))
      : DEFAULT_PAGE_SIZE;

  return { page, limit };
}

export function mapLegacyEvaluationToBackfillPayload(
  evaluation: LegacyEvaluationRecord
): LegacyBackfillPayload {
  return {
    title: buildThreadTitle(evaluation.query),
    userContent: evaluation.query,
    assistantContent: evaluation.answer,
    createdAt: evaluation.createdAt,
  };
}

export const chatHistoryConstants = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_THREAD_TITLE_LENGTH,
};
