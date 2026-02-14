"use client";

import { useCallback, useEffect, useState } from "react";
import { SourceCard } from "./source-card";
import { SourceFilters } from "./source-filters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Library } from "lucide-react";

interface Source {
  id: string;
  title: string;
  sourceType: string;
  sourceUrl?: string | null;
  author?: string | null;
  captureDate: string;
  status: string;
  processingProgress: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function SourceList() {
  const [sources, setSources] = useState<Source[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sort,
      });
      if (typeFilter) params.set("type", typeFilter);

      const response = await fetch(`/api/sources?${params}`);
      const data = await response.json();

      if (response.ok) {
        setSources(data.sources);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch sources:", err);
    } finally {
      setLoading(false);
    }
  }, [page, sort, typeFilter]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

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
      <SourceFilters
        sort={sort}
        typeFilter={typeFilter}
        onSortChange={(s) => {
          setSort(s);
          setPage(1);
        }}
        onTypeFilterChange={(t) => {
          setTypeFilter(t);
          setPage(1);
        }}
      />

      {sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Library className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">No sources yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first article, document, or text to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
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
      )}
    </div>
  );
}
