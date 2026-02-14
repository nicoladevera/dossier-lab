// Mock dependencies that import prisma
jest.mock("@/lib/db", () => ({ prisma: {} }));
jest.mock("@/lib/services/embedding/embedding-service", () => ({}));

import { reciprocalRankFusion } from "./hybrid-search";

describe("reciprocalRankFusion", () => {
  const makeResult = (id: string, sourceId = "src1", chunkIndex = 0) => ({
    chunkId: id,
    sourceId,
    content: `Content for ${id}`,
    chunkIndex,
  });

  it("should combine overlapping results with higher scores", () => {
    const semantic = [makeResult("a"), makeResult("b"), makeResult("c")];
    const keyword = [makeResult("b"), makeResult("c"), makeResult("d")];

    const results = reciprocalRankFusion(semantic, keyword, 60, 10);

    // "b" appears in both lists, should have highest score
    expect(results[0].chunkId).toBe("b");
    // "c" also overlaps
    expect(results[1].chunkId).toBe("c");
  });

  it("should return correct number of results", () => {
    const semantic = [makeResult("a"), makeResult("b")];
    const keyword = [makeResult("c"), makeResult("d")];

    const results = reciprocalRankFusion(semantic, keyword, 60, 3);
    expect(results.length).toBe(3);
  });

  it("should handle empty semantic results", () => {
    const keyword = [makeResult("a"), makeResult("b")];

    const results = reciprocalRankFusion([], keyword, 60, 10);
    expect(results.length).toBe(2);
    expect(results[0].chunkId).toBe("a");
  });

  it("should handle empty keyword results", () => {
    const semantic = [makeResult("a"), makeResult("b")];

    const results = reciprocalRankFusion(semantic, [], 60, 10);
    expect(results.length).toBe(2);
    expect(results[0].chunkId).toBe("a");
  });

  it("should handle both empty results", () => {
    const results = reciprocalRankFusion([], [], 60, 10);
    expect(results.length).toBe(0);
  });

  it("should use k parameter for scoring", () => {
    const semantic = [makeResult("a")];
    const keyword = [makeResult("a")];

    const results60 = reciprocalRankFusion(semantic, keyword, 60, 10);
    const results10 = reciprocalRankFusion(semantic, keyword, 10, 10);

    // Lower k gives higher individual scores, so combined score should be higher
    expect(results10[0].score).toBeGreaterThan(results60[0].score);
  });

  it("should preserve source metadata", () => {
    const semantic = [makeResult("a", "src-123", 5)];
    const results = reciprocalRankFusion(semantic, [], 60, 10);

    expect(results[0].sourceId).toBe("src-123");
    expect(results[0].chunkIndex).toBe(5);
    expect(results[0].content).toBe("Content for a");
  });
});
