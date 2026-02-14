import { keywordSearch } from "./keyword-search";

jest.mock("@/lib/db", () => ({
  prisma: {
    $queryRawUnsafe: jest.fn(),
  },
}));

const { prisma } = jest.requireMock("@/lib/db");

describe("keywordSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns strict full-text matches without using fallback", async () => {
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([
      {
        id: "chunk-1",
        sourceId: "source-1",
        content: "AI systems are rapidly improving.",
        chunkIndex: 0,
        rank: 0.42,
      },
    ]);

    const results = await keywordSearch("what is happening with ai", "user-1", 10);

    expect(results).toEqual([
      {
        chunkId: "chunk-1",
        sourceId: "source-1",
        content: "AI systems are rapidly improving.",
        chunkIndex: 0,
        score: 0.42,
      },
    ]);

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);

    const [sql, queryArg, userArg, topKArg] = (prisma.$queryRawUnsafe as jest.Mock)
      .mock.calls[0];
    expect(sql).toContain("coalesce(s.title, '')");
    expect(sql).toContain("coalesce(s.author, '')");
    expect(queryArg).toBe("what is happening with ai");
    expect(userArg).toBe("user-1");
    expect(topKArg).toBe(10);
  });

  it("falls back to loose matching when strict full-text search returns no rows", async () => {
    (prisma.$queryRawUnsafe as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "chunk-2",
          sourceId: "source-1",
          content: "The author warns that many jobs will be affected.",
          chunkIndex: 2,
          rank: 9,
        },
      ]);

    const results = await keywordSearch("what did shumer say about ai", "user-1", 10);

    expect(results).toEqual([
      {
        chunkId: "chunk-2",
        sourceId: "source-1",
        content: "The author warns that many jobs will be affected.",
        chunkIndex: 2,
        score: 9,
      },
    ]);

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);

    const secondCall = (prisma.$queryRawUnsafe as jest.Mock).mock.calls[1];
    expect(secondCall[0]).toContain("lower(coalesce(s.author, '')) ~");
    expect(secondCall[1]).toBe("user-1");
    expect(secondCall[2]).toBe(10);
    expect(secondCall).toEqual(
      expect.arrayContaining([expect.stringMatching(/\\mshumer\\M/)])
    );
  });

  it("returns no results when fallback has no usable terms", async () => {
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([]);

    const results = await keywordSearch("what did the and of", "user-1", 10);

    expect(results).toEqual([]);
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
  });
});
