jest.mock("mammoth", () => ({
  extractRawText: jest.fn().mockImplementation(({ buffer }: { buffer: Buffer }) => {
    const text = buffer.toString("utf-8");
    return Promise.resolve({ value: text, messages: [] });
  }),
}));

import { extractFromWord } from "./word-extractor";

describe("extractFromWord", () => {
  it("should extract text from Word document", async () => {
    const buffer = Buffer.from("Document Title\n\nThis is the document body.");

    const result = await extractFromWord(buffer, "test-doc.docx");

    expect(result.title).toBe("Document Title");
    expect(result.content).toContain("document body");
  });

  it("should fall back to filename for title when content has long first line", async () => {
    const longLine = "A".repeat(250);
    const buffer = Buffer.from(longLine);

    const result = await extractFromWord(buffer, "my-report.docx");

    expect(result.title).toBe("my-report");
  });
});
