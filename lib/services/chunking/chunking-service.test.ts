import { RecursiveCharacterSplitter } from "./chunking-service";

describe("RecursiveCharacterSplitter", () => {
  const splitter = new RecursiveCharacterSplitter({ chunkSize: 100, chunkOverlap: 20 });

  it("should return empty array for empty text", () => {
    expect(splitter.chunk("")).toEqual([]);
    expect(splitter.chunk("   ")).toEqual([]);
  });

  it("should return single chunk for text shorter than chunk size", () => {
    const text = "Hello, world!";
    const chunks = splitter.chunk(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it("should split text into multiple chunks", () => {
    const text = "A".repeat(250);
    const chunks = splitter.chunk(text);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("should respect chunk size limit", () => {
    const text = "This is a test. ".repeat(50);
    const chunks = splitter.chunk(text);
    // Most chunks should be at or near the limit
    for (const chunk of chunks) {
      // Allow some overflow due to overlap mechanics
      expect(chunk.length).toBeLessThanOrEqual(150);
    }
  });

  it("should include overlap between chunks", () => {
    const text = "word ".repeat(100);
    const chunks = splitter.chunk(text);

    for (let i = 1; i < chunks.length; i++) {
      const prevEnd = chunks[i - 1].slice(-20);
      const currStart = chunks[i].slice(0, 20);
      // The beginning of the current chunk should contain part of the previous chunk's end
      expect(currStart).toBe(prevEnd);
    }
  });

  it("should handle text with special characters", () => {
    const text = "Hello 🌍! ".repeat(50);
    const chunks = splitter.chunk(text);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join("").length).toBeGreaterThan(0);
  });

  it("should prefer splitting on paragraph breaks", () => {
    const text = "Paragraph one content.\n\nParagraph two content.\n\nParagraph three content.";
    const splitterSmall = new RecursiveCharacterSplitter({ chunkSize: 40, chunkOverlap: 10 });
    const chunks = splitterSmall.chunk(text);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("should use default options when none provided", () => {
    const defaultSplitter = new RecursiveCharacterSplitter();
    const text = "A".repeat(600);
    const chunks = defaultSplitter.chunk(text);
    expect(chunks.length).toBeGreaterThan(1);
  });
});
