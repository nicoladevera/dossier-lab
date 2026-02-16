import { POST } from "./route";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hybridSearch } from "@/lib/services/search/hybrid-search";
import { createLLMProvider } from "@/lib/services/llm/provider-factory";
import { calculateCost } from "@/lib/services/evaluation/cost-tracker";
import { scoreGroundedness } from "@/lib/services/evaluation/groundedness";
import { scoreRetrievalAccuracy } from "@/lib/services/evaluation/retrieval-accuracy";
import { checkQueryRateLimit } from "@/lib/rate-limit";
import {
  createOpenAIEmbeddingProvider,
  resolveOpenAIApiKey,
} from "@/lib/services/embedding/provider-factory";

jest.mock("@/lib/auth", () => ({
  getRequiredAuthSession: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    chatThread: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    chatMessage: {
      create: jest.fn(),
    },
    userSettings: {
      findUnique: jest.fn(),
    },
    source: {
      findMany: jest.fn(),
    },
    evaluation: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/services/search/hybrid-search", () => ({
  hybridSearch: jest.fn(),
}));

jest.mock("@/lib/services/llm/provider-factory", () => ({
  createLLMProvider: jest.fn(),
}));

jest.mock("@/lib/services/evaluation/cost-tracker", () => ({
  calculateCost: jest.fn(),
}));

jest.mock("@/lib/services/evaluation/groundedness", () => ({
  scoreGroundedness: jest.fn(),
}));

jest.mock("@/lib/services/evaluation/retrieval-accuracy", () => ({
  scoreRetrievalAccuracy: jest.fn(),
}));

jest.mock("@/lib/rate-limit", () => ({
  checkQueryRateLimit: jest.fn(),
}));

jest.mock("@/lib/services/embedding/provider-factory", () => ({
  createOpenAIEmbeddingProvider: jest.fn(),
  resolveOpenAIApiKey: jest.fn(),
}));

describe("POST /api/qa", () => {
  const mockGetRequiredAuthSession = getRequiredAuthSession as jest.Mock;
  const mockCheckQueryRateLimit = checkQueryRateLimit as jest.Mock;
  const mockResolveOpenAIApiKey = resolveOpenAIApiKey as jest.Mock;
  const mockCreateOpenAIEmbeddingProvider =
    createOpenAIEmbeddingProvider as jest.Mock;
  const mockHybridSearch = hybridSearch as jest.Mock;
  const mockCreateLLMProvider = createLLMProvider as jest.Mock;
  const mockCalculateCost = calculateCost as jest.Mock;
  const mockScoreRetrievalAccuracy = scoreRetrievalAccuracy as jest.Mock;
  const mockScoreGroundedness = scoreGroundedness as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetRequiredAuthSession.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockCheckQueryRateLimit.mockReturnValue({ allowed: true });

    (prisma.chatThread.findFirst as jest.Mock).mockResolvedValue({ id: "thread-1" });
    (prisma.chatThread.update as jest.Mock).mockResolvedValue({});

    (prisma.chatMessage.create as jest.Mock).mockImplementation(({ data }) => {
      if (data.role === "ASSISTANT") {
        return Promise.resolve({ id: "assistant-msg-1" });
      }
      return Promise.resolve({ id: "user-msg-1" });
    });

    (prisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
      defaultProvider: "OPENAI",
      defaultModel: "gpt-5-mini",
      openaiApiKey: null,
      anthropicApiKey: null,
    });

    mockResolveOpenAIApiKey.mockReturnValue("openai-key");
    mockCreateOpenAIEmbeddingProvider.mockReturnValue({});

    mockHybridSearch.mockResolvedValue([
      {
        sourceId: "source-1",
        chunkId: "chunk-1",
        chunkIndex: 0,
        content: "A relevant passage",
      },
    ]);

    (prisma.source.findMany as jest.Mock).mockResolvedValue([
      {
        id: "source-1",
        title: "Test source",
        author: null,
        sourceType: "TEXT",
        sourceUrl: null,
      },
    ]);

    const tokenStream = (async function* () {
      yield "Hello";
    })();

    mockCreateLLMProvider.mockReturnValue({
      generateAnswer: jest.fn().mockResolvedValue({
        stream: tokenStream,
        getUsage: () => ({ promptTokens: 11, completionTokens: 7 }),
      }),
    });

    mockCalculateCost.mockReturnValue(0.0012);

    (prisma.evaluation.create as jest.Mock).mockResolvedValue({ id: "eval-1" });
    (prisma.evaluation.update as jest.Mock).mockResolvedValue({});

    mockScoreRetrievalAccuracy.mockResolvedValue([1]);
    mockScoreGroundedness.mockResolvedValue(1);
  });

  it("persists llmProvider and llmModel when creating an evaluation", async () => {
    const response = await POST(
      new Request("http://localhost/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "What does this source say?",
          threadId: "thread-1",
        }),
      }) as never
    );

    expect(response.status).toBe(200);

    // Consume the stream so persistence side-effects complete.
    await response.text();

    expect(prisma.evaluation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        llmProvider: "OPENAI",
        llmModel: "gpt-5-mini",
      }),
    });

    expect(mockCreateLLMProvider).toHaveBeenCalledWith(
      "OPENAI",
      "gpt-5-mini",
      "openai-key"
    );
  });
});
