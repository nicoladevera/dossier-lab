import { extractFromText } from "./text-extractor";

describe("extractFromText", () => {
  it("should extract title from first line", () => {
    const result = extractFromText("First Line Title\n\nBody text here.", "file.txt");

    expect(result.title).toBe("First Line Title");
    expect(result.content).toContain("Body text here");
  });

  it("should fall back to filename when first line is too long", () => {
    const longLine = "A".repeat(250);
    const result = extractFromText(longLine, "my-notes.txt");

    expect(result.title).toBe("my-notes");
  });

  it("should trim whitespace", () => {
    const result = extractFromText("  \n  Content  \n  ", "test.txt");

    expect(result.content).toBe("Content");
  });
});
