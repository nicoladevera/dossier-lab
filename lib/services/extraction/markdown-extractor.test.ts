import { extractFromMarkdown } from "./markdown-extractor";

describe("extractFromMarkdown", () => {
  it("should extract title from first heading", () => {
    const md = "# My Article\n\nSome content here.";
    const result = extractFromMarkdown(md, "file.md");

    expect(result.title).toBe("My Article");
    expect(result.content).toContain("Some content here");
  });

  it("should fall back to filename when no heading", () => {
    const md = "Just some text without a heading.";
    const result = extractFromMarkdown(md, "notes.md");

    expect(result.title).toBe("notes");
  });

  it("should strip markdown formatting", () => {
    const md = "**bold** and *italic* and [link](http://example.com)";
    const result = extractFromMarkdown(md, "test.md");

    expect(result.content).toContain("bold");
    expect(result.content).toContain("italic");
    expect(result.content).toContain("link");
    expect(result.content).not.toContain("**");
    expect(result.content).not.toContain("http://example.com");
  });

  it("should handle .markdown extension", () => {
    const result = extractFromMarkdown("text", "notes.markdown");
    expect(result.title).toBe("notes");
  });
});
