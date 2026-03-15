import {
  getSourceErrorMessage,
  getSourceStatusLabel,
  partitionKnowledgeBaseSources,
  toSourceSummary,
  type SourceSummary,
} from "./source-status";

describe("source-status helpers", () => {
  it("extracts error messages from metadata", () => {
    expect(getSourceErrorMessage({ error: "Failed to embed" })).toBe(
      "Failed to embed"
    );
    expect(getSourceErrorMessage({})).toBeUndefined();
    expect(getSourceErrorMessage("invalid")).toBeUndefined();
  });

  it("maps coarse processing progress to stage labels", () => {
    expect(
      getSourceStatusLabel({ status: "PROCESSING", processingProgress: 0 })
    ).toBe("Queued for processing");
    expect(
      getSourceStatusLabel({ status: "PROCESSING", processingProgress: 30 })
    ).toBe("Splitting into chunks");
    expect(
      getSourceStatusLabel({ status: "PROCESSING", processingProgress: 70 })
    ).toBe("Indexing for search");
    expect(
      getSourceStatusLabel({ status: "ERROR", processingProgress: 70 })
    ).toBe("Processing failed");
  });

  it("normalizes a source summary with an error message", () => {
    expect(
      toSourceSummary({
        id: "src-1",
        title: "Source",
        sourceType: "URL",
        sourceUrl: "https://example.com",
        author: null,
        captureDate: "2026-03-15T12:00:00.000Z",
        status: "ERROR",
        processingProgress: 70,
        metadata: { error: "Worker failed" },
      })
    ).toMatchObject({
      id: "src-1",
      errorMessage: "Worker failed",
    });
  });

  it("keeps tracked sources pinned while allowing fetched ready items in the main list", () => {
    const pageSources: SourceSummary[] = [
      {
        id: "processing-visible",
        title: "Visible",
        sourceType: "URL",
        captureDate: "2026-03-15T12:00:00.000Z",
        status: "PROCESSING",
        processingProgress: 30,
      },
      {
        id: "ready-visible",
        title: "Ready",
        sourceType: "PDF",
        captureDate: "2026-03-15T11:00:00.000Z",
        status: "READY",
        processingProgress: 100,
      },
    ];
    const trackedSources: SourceSummary[] = [
      {
        id: "processing-visible",
        title: "Visible",
        sourceType: "URL",
        captureDate: "2026-03-15T12:00:00.000Z",
        status: "PROCESSING",
        processingProgress: 70,
      },
      {
        id: "error-hidden",
        title: "Hidden error",
        sourceType: "TEXT",
        captureDate: "2026-03-15T13:00:00.000Z",
        status: "ERROR",
        processingProgress: 70,
        errorMessage: "Failed to process",
      },
      {
        id: "ready-tracked",
        title: "Ready tracked",
        sourceType: "MARKDOWN",
        captureDate: "2026-03-15T14:00:00.000Z",
        status: "READY",
        processingProgress: 100,
      },
    ];

    const { pinnedSources, listSources } = partitionKnowledgeBaseSources(
      pageSources,
      trackedSources
    );

    expect(pinnedSources.map((source) => source.id)).toEqual([
      "ready-tracked",
      "error-hidden",
      "processing-visible",
    ]);
    expect(listSources.map((source) => source.id)).toEqual([
      "ready-visible",
    ]);
  });
});
