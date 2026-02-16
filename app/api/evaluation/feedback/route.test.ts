import { GET, POST } from "./route";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

jest.mock("@/lib/auth", () => ({
  getRequiredAuthSession: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    chatMessage: {
      count: jest.fn(),
    },
    evaluation: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe("/api/evaluation/feedback", () => {
  const mockGetRequiredAuthSession = getRequiredAuthSession as jest.Mock;
  const mockChatMessageCount = prisma.chatMessage.count as jest.Mock;
  const mockEvaluationFindFirst = prisma.evaluation.findFirst as jest.Mock;
  const mockTransaction = prisma.$transaction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRequiredAuthSession.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });
  });

  it("GET aggregates feedback from assistant messages and returns compatibility alias", async () => {
    mockChatMessageCount
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(2);

    const response = await GET(
      new Request("http://localhost/api/evaluation/feedback?days=7") as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      good: 6,
      bad: 2,
      ratedCount: 8,
      totalResponses: 10,
      totalQueries: 10,
      goodRatePct: 75,
      badRatePct: 25,
      ratingCoveragePct: 80,
    });
    expect(mockChatMessageCount).toHaveBeenNthCalledWith(1, {
      where: expect.objectContaining({ userId: "user-1", role: "ASSISTANT" }),
    });
  });

  it("POST mirrors feedback updates to linked assistant message", async () => {
    const txEvaluationUpdate = jest.fn().mockResolvedValue({});
    const txChatMessageUpdateMany = jest.fn().mockResolvedValue({ count: 1 });

    mockEvaluationFindFirst.mockResolvedValue({
      id: "eval-1",
      userId: "user-1",
      assistantMessageId: "msg-1",
    });
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        evaluation: { update: txEvaluationUpdate },
        chatMessage: { updateMany: txChatMessageUpdateMany },
      })
    );

    const response = await POST(
      new Request("http://localhost/api/evaluation/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluationId: "eval-1", feedback: "GOOD" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(txEvaluationUpdate).toHaveBeenCalledWith({
      where: { id: "eval-1" },
      data: { userFeedback: "GOOD" },
    });
    expect(txChatMessageUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "msg-1",
        userId: "user-1",
        role: "ASSISTANT",
      },
      data: {
        userFeedback: "GOOD",
        feedbackUpdatedAt: expect.any(Date),
      },
    });
  });

  it("POST accepts null to clear legacy feedback", async () => {
    mockEvaluationFindFirst.mockResolvedValue({
      id: "eval-1",
      userId: "user-1",
      assistantMessageId: null,
    });
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        evaluation: { update: jest.fn().mockResolvedValue({}) },
        chatMessage: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      })
    );

    const response = await POST(
      new Request("http://localhost/api/evaluation/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluationId: "eval-1", feedback: null }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });
});
