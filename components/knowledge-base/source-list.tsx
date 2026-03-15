"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { SourceCard } from "./source-card";
import { SourceFilters } from "./source-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  partitionKnowledgeBaseSources,
  type SourceSummary,
} from "@/lib/sources/source-status";
import { CheckCircle2, Library, Loader2 } from "lucide-react";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SourceListProps {
  trackedSources?: SourceSummary[];
}

const POLL_INTERVAL_MS = 2000;
const MIN_TRACKED_VISIBILITY_MS = 5000;
const READY_LINGER_MS = 2500;

interface TrackedSourceState extends SourceSummary {
  trackedAt: number;
  readyAt?: number;
}

export function SourceList({ trackedSources = [] }: SourceListProps) {
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [trackedSourceMap, setTrackedSourceMap] = useState<
    Record<string, TrackedSourceState>
  >({});
  const [tabVisible, setTabVisible] = useState(true);
  const pollingRef = useRef(false);
  const trackedSourceMapRef = useRef<Record<string, TrackedSourceState>>({});
  const seenTrackedSourceIdsRef = useRef<Set<string>>(new Set());
  const sourcesRef = useRef<SourceSummary[]>([]);

  useEffect(() => {
    trackedSourceMapRef.current = trackedSourceMap;
  }, [trackedSourceMap]);

  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  useEffect(() => {
    function handleVisibilityChange() {
      setTabVisible(document.visibilityState === "visible");
    }

    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (trackedSources.length === 0) {
      return;
    }

    setTrackedSourceMap((current) => {
      const next = { ...current };
      let changed = false;

      for (const source of trackedSources) {
        const existingSource = current[source.id];
        const hasBeenSeen = seenTrackedSourceIdsRef.current.has(source.id);
        if (hasBeenSeen && !existingSource) {
          continue;
        }

        next[source.id] = {
          ...existingSource,
          ...source,
          trackedAt: existingSource?.trackedAt ?? Date.now(),
          readyAt: existingSource?.readyAt,
        };
        seenTrackedSourceIdsRef.current.add(source.id);
        changed = true;
      }

      return changed ? next : current;
    });
  }, [trackedSources]);

  const fetchSources = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          sort,
        });
        if (typeFilter) {
          params.set("type", typeFilter);
        }

        const response = await fetch(`/api/sources?${params}`);
        const data = await response.json();

        if (response.ok) {
          setSources(data.sources);
          setPagination(data.pagination);
          return data.sources as SourceSummary[];
        }
      } catch (err) {
        console.error("Failed to fetch sources:", err);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }

      return null;
    },
    [page, sort, typeFilter]
  );

  const applyTrackedUpdates = useCallback(
    (updates: SourceSummary[], visibleSourceIds: Set<string>) => {
      if (updates.length === 0) {
        return;
      }

      const current = trackedSourceMapRef.current;
      const next = { ...current };
      let changed = false;
      const readyHiddenSources: SourceSummary[] = [];

      for (const source of updates) {
        const existingSource = current[source.id];
        if (!existingSource) {
          continue;
        }

        if (source.status === "READY") {
          next[source.id] = {
            ...existingSource,
            ...source,
            trackedAt: existingSource.trackedAt,
            readyAt: existingSource.readyAt ?? Date.now(),
          };
          changed = true;
          if (!visibleSourceIds.has(source.id) && !existingSource.readyAt) {
            readyHiddenSources.push(source);
          }
          continue;
        }

        next[source.id] = {
          ...existingSource,
          ...source,
          trackedAt: existingSource.trackedAt,
          readyAt: undefined,
        };
        changed = true;
      }

      if (changed) {
        trackedSourceMapRef.current = next;
        setTrackedSourceMap(next);
      }

      for (const source of readyHiddenSources) {
        toast.success(`"${source.title}" is ready in your knowledge base.`);
      }
    },
    []
  );

  const refreshHiddenTrackedSources = useCallback(
    async (visibleSourceIds: Set<string>) => {
      const hiddenProcessingSourceIds = Object.values(trackedSourceMapRef.current)
        .filter(
          (source) =>
            source.status === "PROCESSING" && !visibleSourceIds.has(source.id)
        )
        .map((source) => source.id);

      if (hiddenProcessingSourceIds.length === 0) {
        return;
      }

      const responses = await Promise.all(
        hiddenProcessingSourceIds.map(async (sourceId) => {
          try {
            const response = await fetch(`/api/sources/${sourceId}/status`);
            if (!response.ok) {
              return null;
            }

            return (await response.json()) as SourceSummary;
          } catch (err) {
            console.error("Failed to fetch source status:", err);
            return null;
          }
        })
      );

      applyTrackedUpdates(
        responses.filter((source): source is SourceSummary => source !== null),
        visibleSourceIds
      );
    },
    [applyTrackedUpdates]
  );

  useEffect(() => {
    void fetchSources({ showLoading: true });
  }, [fetchSources]);

  useEffect(() => {
    const visibleSourceIds = new Set(sources.map((source) => source.id));
    applyTrackedUpdates(sources, visibleSourceIds);
  }, [applyTrackedUpdates, sources]);

  const trackedSourceEntries = useMemo(
    () => Object.values(trackedSourceMap),
    [trackedSourceMap]
  );

  const { pinnedSources, listSources } = useMemo(
    () => partitionKnowledgeBaseSources(sources, trackedSourceEntries),
    [sources, trackedSourceEntries]
  );
  const pinnedSourcesAreProcessing = useMemo(
    () => pinnedSources.some((source) => source.status === "PROCESSING"),
    [pinnedSources]
  );

  const hasProcessingSources = useMemo(
    () =>
      sources.some((source) => source.status === "PROCESSING") ||
      trackedSourceEntries.some((source) => source.status === "PROCESSING"),
    [sources, trackedSourceEntries]
  );

  useEffect(() => {
    if (!tabVisible || !hasProcessingSources) {
      return;
    }

    async function pollSources() {
      if (pollingRef.current) {
        return;
      }

      pollingRef.current = true;

      try {
        const latestSources = await fetchSources();
        const visibleSourceIds = new Set(
          (latestSources ?? sourcesRef.current).map((source) => source.id)
        );
        await refreshHiddenTrackedSources(visibleSourceIds);
      } finally {
        pollingRef.current = false;
      }
    }

    void pollSources();

    const intervalId = window.setInterval(() => {
      void pollSources();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [fetchSources, hasProcessingSources, refreshHiddenTrackedSources, tabVisible]);

  useEffect(() => {
    const readySources = Object.values(trackedSourceMap).filter(
      (source) => source.status === "READY"
    );

    if (readySources.length === 0) {
      return;
    }

    const timeoutIds = readySources.map((source) => {
      const readyAt = source.readyAt ?? Date.now();
      const removeAt = Math.max(
        source.trackedAt + MIN_TRACKED_VISIBILITY_MS,
        readyAt + READY_LINGER_MS
      );
      const delay = Math.max(removeAt - Date.now(), 0);

      return window.setTimeout(() => {
        const current = trackedSourceMapRef.current;
        const trackedSource = current[source.id];

        if (!trackedSource || trackedSource.status !== "READY") {
          return;
        }

        const next = { ...current };
        delete next[source.id];
        trackedSourceMapRef.current = next;
        setTrackedSourceMap(next);
      }, delay);
    });

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [trackedSourceMap]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pinnedSources.length > 0 ? (
        <Card className="border-primary/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              {pinnedSourcesAreProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Recent activity
            </CardTitle>
            <CardDescription>
              Newly added sources stay here briefly so you can confirm they were captured successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pinnedSources.map((source) => (
              <SourceCard key={source.id} source={source} variant="live" />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <SourceFilters
        sort={sort}
        typeFilter={typeFilter}
        onSortChange={(nextSort) => {
          setSort(nextSort);
          setPage(1);
        }}
        onTypeFilterChange={(nextTypeFilter) => {
          setTypeFilter(nextTypeFilter);
          setPage(1);
        }}
      />

      {listSources.length === 0 ? (
        pinnedSources.length > 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <h3 className="text-sm font-medium">No ready sources in this view yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll move items into the knowledge base automatically as soon
              as they finish processing.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Library className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No sources yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first article, document, or text to get started.
            </p>
          </div>
        )
      ) : (
        <div className="space-y-2">
          {listSources.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
