import { GET } from "./route";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

jest.mock("@/lib/auth", () => ({
  getRequiredAuthSession: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    chatThread: {
      findFirst: jest.fn(),
    },
  },
}));

describe("GET /api/qa/threads/[id]", () => {
  const mockGetRequiredAuthSession = getRequiredAuthSession as jest.Mock;
  const mockFindFirst = prisma.chatThread.findFirst as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRequiredAuthSession.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });
  });

  it("returns feedback fields in thread detail messages", async () => {
    mockFindFirst.mockResolvedValue({
      id: "thread-1",
      title: "My thread",
      createdAt: new Date("2026-02-16T10:00:00.000Z"),
      updatedAt: new Date("2026-02-16T10:05:00.000Z"),
      messages: [
        {
          id: "msg-1",
          role: "ASSISTANT",
          content: "Answer",
          citations: [],
          noContext: false,
          legacyImported: false,
          createdAt: new Date("2026-02-16T10:01:00.000Z"),
          userFeedback: "GOOD",
          feedbackUpdatedAt: new Date("2026-02-16T10:02:00.000Z"),
          evaluation: { id: "eval-1" },
        },
      ],
    });

    const response = await GET(new Request("http://localhost/api/qa/threads/thread-1") as never, {
      params: Promise.resolve({ id: "thread-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.messages).toHaveLength(1);
    expect(body.messages[0]).toMatchObject({
      id: "msg-1",
      role: "ASSISTANT",
      userFeedback: "GOOD",
      evaluationId: "eval-1",
    });
    expect(body.messages[0].feedbackUpdatedAt).toBe("2026-02-16T10:02:00.000Z");
  });

  it("returns 404 when thread is missing", async () => {
    mockFindFirst.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/qa/threads/missing") as never, {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Thread not found" });
  });
});
