import * as pdfExtractor from "./pdf-extractor";

describe("extractFromPdf", () => {
  it("should extract text and metadata from PDF", async () => {
    const buffer = Buffer.from("fake pdf data");
    const cleanup = jest.fn();
    const destroy = jest.fn().mockResolvedValue(undefined);

    const moduleMock = {
      getDocument: jest.fn().mockReturnValue({
        promise: Promise.resolve({
          numPages: 1,
          getMetadata: jest.fn().mockResolvedValue({
            info: {
              Title: "Test PDF Title",
              Author: "Test Author",
            },
          }),
          getPage: jest.fn().mockResolvedValue({
            getTextContent: jest.fn().mockResolvedValue({
              items: [{ str: "This is the PDF content for testing." }],
            }),
            cleanup,
          }),
          destroy,
        }),
      }),
    };

    const result = await pdfExtractor.extractFromPdf(buffer, "test-document.pdf", {
      loadPdfJsModule: async () => moduleMock as never,
    });

    expect(result.title).toBe("Test PDF Title");
    expect(result.author).toBe("Test Author");
    expect(result.content).toContain("PDF content");
    expect(result.pageCount).toBe(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("should fall back to filename for title when PDF info is missing", async () => {
    const moduleMock = {
      getDocument: jest.fn().mockReturnValue({
        promise: Promise.resolve({
          numPages: 2,
          getMetadata: jest.fn().mockResolvedValue({ info: {} }),
          getPage: jest
            .fn()
            .mockResolvedValueOnce({
              getTextContent: jest.fn().mockResolvedValue({
                items: [{ str: "Content without title page 1" }],
              }),
              cleanup: jest.fn(),
            })
            .mockResolvedValueOnce({
              getTextContent: jest.fn().mockResolvedValue({
                items: [{ str: "Content without title page 2" }],
              }),
              cleanup: jest.fn(),
            }),
          destroy: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    };

    const result = await pdfExtractor.extractFromPdf(
      Buffer.from("test"),
      "my-document.pdf",
      {
        loadPdfJsModule: async () => moduleMock as never,
      }
    );

    expect(result.title).toBe("my-document");
    expect(result.content).toContain("page 1");
    expect(result.content).toContain("page 2");
    expect(result.pageCount).toBe(2);
  });
});
