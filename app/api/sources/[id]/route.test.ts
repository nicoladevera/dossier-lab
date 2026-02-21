import { GET, DELETE } from "./route";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

jest.mock("@/lib/auth", () => ({
  getRequiredAuthSession: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    source: {
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/sources/[id]", () => {
  const mockGetRequiredAuthSession = getRequiredAuthSession as jest.Mock;
  const mockFindFirst = prisma.source.findFirst as jest.Mock;

  const mockSource = {
    id: "src-1",
    title: "Test Source",
    sourceType: "URL",
    sourceUrl: "https://example.com",
    author: null,
    captureDate: new Date("2026-01-01"),
    status: "READY",
    processingProgress: 100,
    chunks: [
      { id: "chunk-2", chunkIndex: 1, content: "Second chunk" },
      { id: "chunk-1", chunkIndex: 0, content: "First chunk" },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRequiredAuthSession.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue(mockSource);
  });

  it("returns source with 200 when found", async () => {
    const response = await GET(
      new Request("http://localhost/api/sources/src-1") as never,
      makeParams("src-1")
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("source");
    expect(body.source.id).toBe("src-1");
  });

  it("queries by id and userId for ownership check", async () => {
    await GET(
      new Request("http://localhost/api/sources/src-1") as never,
      makeParams("src-1")
    );

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "src-1", userId: "user-1" },
      })
    );
  });

  it("orders chunks by chunkIndex asc", async () => {
    await GET(
      new Request("http://localhost/api/sources/src-1") as never,
      makeParams("src-1")
    );

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          chunks: expect.objectContaining({
            orderBy: { chunkIndex: "asc" },
          }),
        }),
      })
    );
  });

  it("returns 404 when source not found", async () => {
    mockFindFirst.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/sources/missing") as never,
      makeParams("missing")
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Source not found" });
  });

  it("returns 401 when auth throws Unauthorized", async () => {
    mockGetRequiredAuthSession.mockRejectedValue(new Error("Unauthorized"));

    const response = await GET(
      new Request("http://localhost/api/sources/src-1") as never,
      makeParams("src-1")
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});

describe("DELETE /api/sources/[id]", () => {
  const mockGetRequiredAuthSession = getRequiredAuthSession as jest.Mock;
  const mockFindFirst = prisma.source.findFirst as jest.Mock;
  const mockDelete = prisma.source.delete as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRequiredAuthSession.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue({ id: "src-1" });
    mockDelete.mockResolvedValue({ id: "src-1" });
  });

  it("returns { success: true } with 200 on successful delete", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/sources/src-1", { method: "DELETE" }) as never,
      makeParams("src-1")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it("verifies ownership before deleting", async () => {
    await DELETE(
      new Request("http://localhost/api/sources/src-1", { method: "DELETE" }) as never,
      makeParams("src-1")
    );

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "src-1", userId: "user-1" },
      })
    );
  });

  it("calls prisma.source.delete with correct id", async () => {
    await DELETE(
      new Request("http://localhost/api/sources/src-1", { method: "DELETE" }) as never,
      makeParams("src-1")
    );

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "src-1" } });
  });

  it("returns 404 and does not delete when source not found", async () => {
    mockFindFirst.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost/api/sources/missing", { method: "DELETE" }) as never,
      makeParams("missing")
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Source not found" });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("returns 401 when auth throws Unauthorized", async () => {
    mockGetRequiredAuthSession.mockRejectedValue(new Error("Unauthorized"));

    const response = await DELETE(
      new Request("http://localhost/api/sources/src-1", { method: "DELETE" }) as never,
      makeParams("src-1")
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});
