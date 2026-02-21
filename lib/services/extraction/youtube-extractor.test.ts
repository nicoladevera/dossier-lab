import {
  isYouTubeUrl,
  extractVideoId,
  extractFromYouTube,
} from "./youtube-extractor";

describe("isYouTubeUrl", () => {
  it("returns true for https://www.youtube.com/watch?v=abc123", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=abc123")).toBe(true);
  });

  it("returns true for https://youtube.com/watch?v=abc123", () => {
    expect(isYouTubeUrl("https://youtube.com/watch?v=abc123")).toBe(true);
  });

  it("returns true for https://m.youtube.com/watch?v=abc123", () => {
    expect(isYouTubeUrl("https://m.youtube.com/watch?v=abc123")).toBe(true);
  });

  it("returns true for https://youtu.be/abc123", () => {
    expect(isYouTubeUrl("https://youtu.be/abc123")).toBe(true);
  });

  it("returns true for https://www.youtube.com/shorts/abc123", () => {
    expect(isYouTubeUrl("https://www.youtube.com/shorts/abc123")).toBe(true);
  });

  it("returns false for https://example.com", () => {
    expect(isYouTubeUrl("https://example.com")).toBe(false);
  });

  it("returns false for https://notyoutube.com/watch?v=abc123", () => {
    expect(isYouTubeUrl("https://notyoutube.com/watch?v=abc123")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isYouTubeUrl("")).toBe(false);
  });

  it("returns false for not-a-url", () => {
    expect(isYouTubeUrl("not-a-url")).toBe(false);
  });
});

describe("extractVideoId", () => {
  it("extracts ID from /watch?v=ID format", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("extracts ID from youtu.be/ID format", () => {
    expect(extractVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("extracts ID from /shorts/ID format", () => {
    expect(
      extractVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")
    ).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from /embed/ID format", () => {
    expect(extractVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("returns null for YouTube URL without video ID", () => {
    expect(extractVideoId("https://www.youtube.com/")).toBeNull();
  });

  it("returns null for non-YouTube URL without matching path", () => {
    expect(extractVideoId("https://example.com/article/123")).toBeNull();
  });

  it("returns null for invalid URL", () => {
    expect(extractVideoId("not-a-url")).toBeNull();
  });
});

describe("extractFromYouTube", () => {
  it("returns data on successful extraction with transcript and oEmbed", async () => {
    const mockFetchTranscript = jest.fn().mockResolvedValue([
      { text: "Hello world" },
      { text: "this is a test" },
    ]);
    const mockFetchOEmbed = jest.fn().mockResolvedValue({
      title: "Test Video",
      author_name: "Test Channel",
      thumbnail_url: "https://i.ytimg.com/vi/abc123/maxresdefault.jpg",
    });

    const result = await extractFromYouTube(
      "https://www.youtube.com/watch?v=abc123",
      {
        fetchTranscript: mockFetchTranscript,
        fetchOEmbed: mockFetchOEmbed,
      }
    );

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.title).toBe("Test Video");
    expect(result.data!.content).toBe("Hello world this is a test");
    expect(result.data!.author).toBe("Test Channel");
    expect(result.data!.metadata.videoId).toBe("abc123");
    expect(result.data!.metadata.thumbnailUrl).toBe(
      "https://i.ytimg.com/vi/abc123/maxresdefault.jpg"
    );
    expect(result.data!.metadata.channel).toBe("Test Channel");

    expect(mockFetchTranscript).toHaveBeenCalledWith("abc123");
    expect(mockFetchOEmbed).toHaveBeenCalledWith(
      "https://www.youtube.com/watch?v=abc123"
    );
  });

  it("returns error when URL is not a YouTube URL", async () => {
    const result = await extractFromYouTube("https://example.com/video");

    expect(result.error).toBe("Not a valid YouTube URL");
    expect(result.data).toBeUndefined();
  });

  it("returns error when no transcript available (empty segments)", async () => {
    const mockFetchTranscript = jest.fn().mockResolvedValue([]);
    const mockFetchOEmbed = jest.fn().mockResolvedValue(null);

    const result = await extractFromYouTube(
      "https://www.youtube.com/watch?v=abc123",
      {
        fetchTranscript: mockFetchTranscript,
        fetchOEmbed: mockFetchOEmbed,
      }
    );

    expect(result.error).toContain("No transcript available for this video");
    expect(result.data).toBeUndefined();
  });

  it("returns error when transcript fetch throws", async () => {
    const mockFetchTranscript = jest
      .fn()
      .mockRejectedValue(new Error("Transcript disabled"));
    const mockFetchOEmbed = jest.fn().mockResolvedValue(null);

    const result = await extractFromYouTube(
      "https://www.youtube.com/watch?v=abc123",
      {
        fetchTranscript: mockFetchTranscript,
        fetchOEmbed: mockFetchOEmbed,
      }
    );

    expect(result.error).toContain("Failed to fetch transcript");
    expect(result.error).toContain("Transcript disabled");
    expect(result.data).toBeUndefined();
  });

  it("falls back to defaults when oEmbed fails", async () => {
    const mockFetchTranscript = jest.fn().mockResolvedValue([
      { text: "Some transcript text" },
    ]);
    const mockFetchOEmbed = jest.fn().mockResolvedValue(null);

    const result = await extractFromYouTube(
      "https://www.youtube.com/watch?v=abc123",
      {
        fetchTranscript: mockFetchTranscript,
        fetchOEmbed: mockFetchOEmbed,
      }
    );

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.title).toBe("abc123");
    expect(result.data!.author).toBe("Unknown");
    expect(result.data!.metadata.thumbnailUrl).toBe(
      "https://i.ytimg.com/vi/abc123/hqdefault.jpg"
    );
    expect(result.data!.metadata.channel).toBe("Unknown");
    expect(result.data!.content).toBe("Some transcript text");
  });
});
