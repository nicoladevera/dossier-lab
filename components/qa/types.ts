import type { CitationData } from "@/components/qa/citation";

export interface QAThreadSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface QAPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface QAThreadMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations: CitationData[] | null;
  noContext: boolean;
  legacyImported: boolean;
  createdAt: string;
  evaluationId: string | null;
  userFeedback: "GOOD" | "BAD" | null;
  feedbackUpdatedAt: string | null;
}
