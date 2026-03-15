import { GET } from "./route";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

jest.mock("@/lib/auth", () => ({
  getRequiredAuthSession: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    source: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe("GET /api/sources", () => {
  const mockGetRequiredAuthSession = getRequiredAuthSession as jest.Mock;
  const mockFindMany = prisma.source.findMany as jest.Mock;
  const mockCount = prisma.source.count as jest.Mock;

  const mockSources = [
    {
      id: "src-1",
      title: "Test Source",
      sourceType: "URL",
      sourceUrl: "https://example.com",
      author: null,
      captureDate: new Date("2026-01-01"),
      status: "READY",
      processingProgress: 100,
      metadata: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRequiredAuthSession.mockResolvedValue({ user: { id: "user-1" } });
    mockFindMany.mockResolvedValue(mockSources);
    mockCount.mockResolvedValue(1);
  });

  it("returns sources and pagination with 200", async () => {
    const response = await GET(
      new Request("http://localhost/api/sources") as never
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("sources");
    expect(body).toHaveProperty("pagination");
    expect(body.sources).toHaveLength(1);
    expect(body.sources[0]).toMatchObject({ id: "src-1", sourceType: "URL" });
    expect(body.pagination).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it("projects errorMessage from metadata without exposing metadata", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "src-2",
        title: "Broken Source",
        sourceType: "PDF",
        sourceUrl: null,
        author: null,
        captureDate: new Date("2026-01-02"),
        status: "ERROR",
        processingProgress: 70,
        metadata: { error: "Failed to embed" },
      },
    ]);

    const response = await GET(
      new Request("http://localhost/api/sources") as never
    );
    const body = await response.json();

    expect(body.sources[0]).toMatchObject({
      id: "src-2",
      errorMessage: "Failed to embed",
    });
    expect(body.sources[0]).not.toHaveProperty("metadata");
  });

  it("queries with userId in where clause", async () => {
    await GET(new Request("http://localhost/api/sources") as never);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-1" }) })
    );
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-1" }) })
    );
  });

  describe("sorting", () => {
    it("defaults to captureDate desc", async () => {
      await GET(new Request("http://localhost/api/sources") as never);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { captureDate: "desc" } })
      );
    });

    it("sorts captureDate asc when sort=oldest", async () => {
      await GET(new Request("http://localhost/api/sources?sort=oldest") as never);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { captureDate: "asc" } })
      );
    });
  });

  describe("type filtering", () => {
    it("includes sourceType in where when type=PDF", async () => {
      await GET(new Request("http://localhost/api/sources?type=PDF") as never);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "user-1", sourceType: "PDF" }),
        })
      );
    });

    it("includes sourceType in where when type=YOUTUBE", async () => {
      await GET(new Request("http://localhost/api/sources?type=YOUTUBE") as never);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ sourceType: "YOUTUBE" }),
        })
      );
    });

    it("ignores invalid type filter", async () => {
      await GET(new Request("http://localhost/api/sources?type=INVALID") as never);

      const call = mockFindMany.mock.calls[0][0];
      expect(call.where).not.toHaveProperty("sourceType");
    });
  });

  describe("pagination", () => {
    it("applies skip and take based on page and limit", async () => {
      mockCount.mockResolvedValue(20);

      await GET(new Request("http://localhost/api/sources?page=2&limit=5") as never);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 })
      );
    });

    it("calculates totalPages correctly", async () => {
      mockCount.mockResolvedValue(20);

      const response = await GET(
        new Request("http://localhost/api/sources?page=2&limit=5") as never
      );
      const body = await response.json();

      expect(body.pagination).toMatchObject({
        page: 2,
        limit: 5,
        total: 20,
        totalPages: 4,
      });
    });

    it("clamps page to minimum of 1", async () => {
      await GET(new Request("http://localhost/api/sources?page=0") as never);

      const call = mockFindMany.mock.calls[0][0];
      expect(call.skip).toBe(0);
    });

    it("clamps limit to maximum of 50", async () => {
      await GET(new Request("http://localhost/api/sources?limit=100") as never);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 })
      );
    });

    it("clamps limit to minimum of 1", async () => {
      await GET(new Request("http://localhost/api/sources?limit=0") as never);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 })
      );
    });
  });

  it("returns 401 when auth throws Unauthorized", async () => {
    mockGetRequiredAuthSession.mockRejectedValue(new Error("Unauthorized"));

    const response = await GET(new Request("http://localhost/api/sources") as never);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});
