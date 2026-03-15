import { GET } from "./route";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

jest.mock("@/lib/auth", () => ({
  getRequiredAuthSession: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    source: {
      findFirst: jest.fn(),
    },
  },
}));

describe("GET /api/sources/[id]/status", () => {
  const mockGetRequiredAuthSession = getRequiredAuthSession as jest.Mock;
  const mockFindFirst = prisma.source.findFirst as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRequiredAuthSession.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("returns a normalized source summary for polling", async () => {
    mockFindFirst.mockResolvedValue({
      id: "src-1",
      title: "Queued Source",
      sourceType: "URL",
      sourceUrl: "https://example.com",
      author: null,
      captureDate: new Date("2026-03-15T12:00:00.000Z"),
      status: "PROCESSING",
      processingProgress: 30,
      metadata: null,
    });

    const response = await GET({} as Request, {
      params: Promise.resolve({ id: "src-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: "src-1",
      title: "Queued Source",
      sourceType: "URL",
      status: "PROCESSING",
      processingProgress: 30,
    });
  });

  it("returns errorMessage when processing fails", async () => {
    mockFindFirst.mockResolvedValue({
      id: "src-2",
      title: "Broken Source",
      sourceType: "PDF",
      sourceUrl: null,
      author: null,
      captureDate: new Date("2026-03-15T13:00:00.000Z"),
      status: "ERROR",
      processingProgress: 70,
      metadata: { error: "Failed to process document" },
    });

    const response = await GET({} as Request, {
      params: Promise.resolve({ id: "src-2" }),
    });

    await expect(response.json()).resolves.toMatchObject({
      id: "src-2",
      errorMessage: "Failed to process document",
    });
  });

  it("returns 404 when the source is missing", async () => {
    mockFindFirst.mockResolvedValue(null);

    const response = await GET({} as Request, {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 401 when auth fails", async () => {
    mockGetRequiredAuthSession.mockRejectedValue(new Error("Unauthorized"));

    const response = await GET({} as Request, {
      params: Promise.resolve({ id: "src-1" }),
    });

    expect(response.status).toBe(401);
  });
});
