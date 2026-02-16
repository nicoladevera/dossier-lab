import {
  buildThreadTitle,
  clampPagination,
  mapLegacyEvaluationToBackfillPayload,
  chatHistoryConstants,
} from "./chat-history";

describe("chat history helpers", () => {
  describe("buildThreadTitle", () => {
    it("normalizes whitespace", () => {
      expect(buildThreadTitle("  What   is   RAG? \n")).toBe("What is RAG?");
    });

    it("truncates to max length", () => {
      const longQuestion = "a".repeat(chatHistoryConstants.MAX_THREAD_TITLE_LENGTH + 20);
      expect(buildThreadTitle(longQuestion)).toHaveLength(
        chatHistoryConstants.MAX_THREAD_TITLE_LENGTH
      );
    });

    it("falls back to default title for empty input", () => {
      expect(buildThreadTitle("   ")).toBe("Untitled chat");
    });
  });

  describe("clampPagination", () => {
    it("uses defaults when values are missing", () => {
      expect(clampPagination({})).toEqual({ page: 1, limit: 20 });
    });

    it("clamps invalid values", () => {
      expect(clampPagination({ page: -2, limit: 999 })).toEqual({
        page: 1,
        limit: 50,
      });
    });

    it("normalizes floats to integers", () => {
      expect(clampPagination({ page: 2.9, limit: 19.7 })).toEqual({
        page: 2,
        limit: 19,
      });
    });
  });

  describe("mapLegacyEvaluationToBackfillPayload", () => {
    it("maps evaluation fields for legacy backfill", () => {
      const createdAt = new Date("2026-02-10T12:00:00.000Z");
      const payload = mapLegacyEvaluationToBackfillPayload({
        query: "What changed this week?",
        answer: "Several updates were released.",
        createdAt,
      });

      expect(payload).toEqual({
        title: "What changed this week?",
        userContent: "What changed this week?",
        assistantContent: "Several updates were released.",
        createdAt,
      });
    });
  });
});
