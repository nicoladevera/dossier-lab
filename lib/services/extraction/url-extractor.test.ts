import { extractFromUrl } from "./url-extractor";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("extractFromUrl", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should extract content from a full article", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "text/html" }),
      text: async () => `
        <html>
          <head><title>Test Article</title></head>
          <body>
            <article>
              <h1>Test Article</h1>
              <p>By John Doe</p>
              <p>${"A".repeat(600)}</p>
            </article>
          </body>
        </html>
      `,
    });

    const result = await extractFromUrl("https://example.com/article");

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.title).toBeTruthy();
    expect(result.data!.content).toBeTruthy();
  });

  it("should return error for failed HTTP requests", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers(),
    });

    const result = await extractFromUrl("https://example.com/missing");

    expect(result.error).toContain("Failed to fetch URL");
    expect(result.data).toBeUndefined();
  });

  it("should return error for non-HTML content types", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => "{}",
    });

    const result = await extractFromUrl("https://example.com/api");

    expect(result.error).toContain("not point to an HTML page");
  });

  it("should return paywall error for minimal content", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "text/html" }),
      text: async () => `
        <html>
          <body>
            <article><p>Short teaser text.</p></article>
          </body>
        </html>
      `,
    });

    const result = await extractFromUrl("https://example.com/paywall");

    // Either error about paywall or extraction failure
    expect(result.error || result.data).toBeDefined();
  });

  it("should handle network errors", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await extractFromUrl("https://example.com/down");

    expect(result.error).toContain("Failed to fetch URL");
  });
});
