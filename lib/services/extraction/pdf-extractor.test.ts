jest.mock("pdf-parse", () => {
  return jest.fn().mockImplementation((buffer: Buffer) => {
    const text = buffer.toString("utf-8");
    return Promise.resolve({
      text,
      numpages: 1,
      info: {
        Title: "Test PDF Title",
        Author: "Test Author",
      },
    });
  });
});

import { extractFromPdf } from "./pdf-extractor";

describe("extractFromPdf", () => {
  it("should extract text and metadata from PDF", async () => {
    const buffer = Buffer.from("This is the PDF content for testing.");

    const result = await extractFromPdf(buffer, "test-document.pdf");

    expect(result.title).toBe("Test PDF Title");
    expect(result.author).toBe("Test Author");
    expect(result.content).toContain("PDF content");
    expect(result.pageCount).toBe(1);
  });

  it("should fall back to filename for title when PDF info is missing", async () => {
    const pdfParse = require("pdf-parse");
    pdfParse.mockImplementationOnce(() =>
      Promise.resolve({
        text: "Content without title",
        numpages: 2,
        info: {},
      })
    );

    const result = await extractFromPdf(
      Buffer.from("test"),
      "my-document.pdf"
    );

    expect(result.title).toBe("my-document");
    expect(result.pageCount).toBe(2);
  });
});
