import { PATCH } from "./route";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

jest.mock("@/lib/auth", () => ({
  getRequiredAuthSession: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    chatMessage: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe("PATCH /api/qa/messages/[id]/feedback", () => {
  const mockGetRequiredAuthSession = getRequiredAuthSession as jest.Mock;
  const mockFindFirst = prisma.chatMessage.findFirst as jest.Mock;
  const mockTransaction = prisma.$transaction as jest.Mock;

  const defaultSession = {
    user: {
      id: "user-1",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRequiredAuthSession.mockResolvedValue(defaultSession);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetRequiredAuthSession.mockRejectedValue(new Error("Unauthorized"));

    const request = new Request("http://localhost/api/qa/messages/msg-1/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: "GOOD" }),
    });

    const response = await PATCH(request as never, {
      params: Promise.resolve({ id: "msg-1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for invalid payload", async () => {
    const request = new Request("http://localhost/api/qa/messages/msg-1/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: "MAYBE" }),
    });

    const response = await PATCH(request as never, {
      params: Promise.resolve({ id: "msg-1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid feedback" });
  });

  it("returns 404 when message is not found for this user", async () => {
    mockFindFirst.mockResolvedValue(null);

    const request = new Request("http://localhost/api/qa/messages/msg-1/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: "GOOD" }),
    });

    const response = await PATCH(request as never, {
      params: Promise.resolve({ id: "msg-1" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Assistant message not found",
    });

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        id: "msg-1",
        userId: "user-1",
        role: "ASSISTANT",
      },
      select: {
        id: true,
        evaluation: {
          select: {
            id: true,
          },
        },
      },
    });
  });

  it("returns 404 for non-assistant messages", async () => {
    mockFindFirst.mockResolvedValue(null);

    const request = new Request("http://localhost/api/qa/messages/msg-user/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: "BAD" }),
    });

    const response = await PATCH(request as never, {
      params: Promise.resolve({ id: "msg-user" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Assistant message not found",
    });
  });

  it("sets GOOD feedback and mirrors to linked evaluation", async () => {
    const feedbackUpdatedAt = new Date("2026-02-16T12:00:00.000Z");
    const txChatMessageUpdate = jest.fn().mockResolvedValue({
      id: "msg-1",
      userFeedback: "GOOD",
      feedbackUpdatedAt,
    });
    const txEvaluationUpdateMany = jest.fn().mockResolvedValue({ count: 1 });

    mockFindFirst.mockResolvedValue({
      id: "msg-1",
      evaluation: { id: "eval-1" },
    });
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        chatMessage: { update: txChatMessageUpdate },
        evaluation: { updateMany: txEvaluationUpdateMany },
      })
    );

    const request = new Request("http://localhost/api/qa/messages/msg-1/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: "GOOD" }),
    });

    const response = await PATCH(request as never, {
      params: Promise.resolve({ id: "msg-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      messageId: "msg-1",
      userFeedback: "GOOD",
    });
    expect(txEvaluationUpdateMany).toHaveBeenCalledWith({
      where: { id: "eval-1", userId: "user-1" },
      data: {
        userFeedback: "GOOD",
      },
    });
  });

  it("switches GOOD to BAD", async () => {
    const txChatMessageUpdate = jest.fn().mockResolvedValue({
      id: "msg-1",
      userFeedback: "BAD",
      feedbackUpdatedAt: new Date("2026-02-16T12:01:00.000Z"),
    });

    mockFindFirst.mockResolvedValue({
      id: "msg-1",
      evaluation: null,
    });
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        chatMessage: { update: txChatMessageUpdate },
        evaluation: { updateMany: jest.fn() },
      })
    );

    const request = new Request("http://localhost/api/qa/messages/msg-1/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: "BAD" }),
    });

    const response = await PATCH(request as never, {
      params: Promise.resolve({ id: "msg-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      messageId: "msg-1",
      userFeedback: "BAD",
    });
  });

  it("clears BAD feedback to null", async () => {
    const txChatMessageUpdate = jest.fn().mockResolvedValue({
      id: "msg-1",
      userFeedback: null,
      feedbackUpdatedAt: new Date("2026-02-16T12:02:00.000Z"),
    });

    mockFindFirst.mockResolvedValue({
      id: "msg-1",
      evaluation: { id: "eval-1" },
    });
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        chatMessage: { update: txChatMessageUpdate },
        evaluation: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      })
    );

    const request = new Request("http://localhost/api/qa/messages/msg-1/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: null }),
    });

    const response = await PATCH(request as never, {
      params: Promise.resolve({ id: "msg-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      messageId: "msg-1",
      userFeedback: null,
    });
  });
});
