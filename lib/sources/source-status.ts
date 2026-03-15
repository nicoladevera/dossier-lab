export interface SourceSummary {
  id: string;
  title: string;
  sourceType: string;
  sourceUrl?: string | null;
  author?: string | null;
  captureDate: string | Date;
  status: string;
  processingProgress: number;
  errorMessage?: string;
}

export type CapturedSourceSummary = SourceSummary;

export function getSourceErrorMessage(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  const error = (metadata as Record<string, unknown>).error;
  return typeof error === "string" && error.length > 0 ? error : undefined;
}

export function toSourceSummary(
  source: SourceSummary & { metadata?: unknown }
): SourceSummary {
  return {
    id: source.id,
    title: source.title,
    sourceType: source.sourceType,
    sourceUrl: source.sourceUrl ?? null,
    author: source.author ?? null,
    captureDate: source.captureDate,
    status: source.status,
    processingProgress: source.processingProgress,
    errorMessage: getSourceErrorMessage(source.metadata) ?? source.errorMessage,
  };
}

export function getSourceStatusLabel(
  source: Pick<SourceSummary, "status" | "processingProgress">
): string {
  if (source.status === "ERROR") {
    return "Processing failed";
  }

  if (source.status === "READY") {
    return "Ready";
  }

  if (source.processingProgress >= 70) {
    return "Indexing for search";
  }

  if (source.processingProgress >= 30) {
    return "Splitting into chunks";
  }

  return "Queued for processing";
}

export function partitionKnowledgeBaseSources(
  pageSources: SourceSummary[],
  trackedSources: SourceSummary[]
) {
  const pinnedSourceMap = new Map<string, SourceSummary>();

  for (const source of pageSources) {
    if (source.status === "PROCESSING") {
      pinnedSourceMap.set(source.id, source);
    }
  }

  for (const source of trackedSources) {
    pinnedSourceMap.set(source.id, source);
  }

  const pinnedSources = Array.from(pinnedSourceMap.values()).sort(
    (left, right) =>
      new Date(right.captureDate).getTime() - new Date(left.captureDate).getTime()
  );

  const pinnedOnlySourceIds = new Set(
    pinnedSources
      .filter((source) => source.status !== "READY")
      .map((source) => source.id)
  );
  const listSources = pageSources.filter(
    (source) => !pinnedOnlySourceIds.has(source.id)
  );

  return { pinnedSources, listSources };
}
