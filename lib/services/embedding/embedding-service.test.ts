import { OpenAIEmbeddingProvider } from "./embedding-service";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("OpenAIEmbeddingProvider", () => {
  let provider: OpenAIEmbeddingProvider;

  beforeEach(() => {
    provider = new OpenAIEmbeddingProvider("test-api-key");
    mockFetch.mockReset();
  });

  it("should have correct model ID and dimensions", () => {
    expect(provider.modelId).toBe("text-embedding-3-small");
    expect(provider.dimensions).toBe(1536);
  });

  it("should return empty array for empty input", async () => {
    const result = await provider.embed([]);
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should call OpenAI API with correct parameters", async () => {
    const mockEmbedding = Array(1536).fill(0.1);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ index: 0, embedding: mockEmbedding }],
      }),
    });

    const texts = ["Hello world"];
    const result = await provider.embed(texts);

    expect(mockFetch).toHaveBeenCalledWith("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-api-key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: texts,
        model: "text-embedding-3-small",
      }),
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(1536);
  });

  it("should handle multiple texts", async () => {
    const mockEmbeddings = [
      { index: 0, embedding: Array(1536).fill(0.1) },
      { index: 1, embedding: Array(1536).fill(0.2) },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockEmbeddings }),
    });

    const result = await provider.embed(["text1", "text2"]);
    expect(result).toHaveLength(2);
  });

  it("should sort results by index", async () => {
    const mockEmbeddings = [
      { index: 1, embedding: Array(1536).fill(0.2) },
      { index: 0, embedding: Array(1536).fill(0.1) },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockEmbeddings }),
    });

    const result = await provider.embed(["text1", "text2"]);
    expect(result[0][0]).toBe(0.1);
    expect(result[1][0]).toBe(0.2);
  });

  it("should throw error on API failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    await expect(provider.embed(["test"])).rejects.toThrow("OpenAI embedding API error");
  });

  it("should batch requests for large inputs", async () => {
    const mockEmbedding = Array(1536).fill(0.1);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: Array(100)
          .fill(null)
          .map((_, i) => ({ index: i, embedding: mockEmbedding })),
      }),
    });

    // 150 texts should result in 2 API calls (batch size 100)
    const texts = Array(150).fill("test text");
    await provider.embed(texts);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
