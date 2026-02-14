"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface SearchResultItem {
  chunkId: string;
  sourceId: string;
  chunkIndex: number;
  snippet: string;
  score: number;
  source: {
    id: string;
    title: string;
    sourceType: string;
    sourceUrl?: string | null;
    author?: string | null;
    captureDate: string;
  } | null;
}

interface SearchResultsProps {
  results: SearchResultItem[];
  query: string;
}

export function SearchResults({ results, query }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-medium">No results found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No results found for &quot;{query}&quot;. Try different keywords or add more
          sources to your knowledge base.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {results.length} result{results.length !== 1 ? "s" : ""} for &quot;{query}&quot;
      </p>
      {results.map((result) => (
        <Link
          key={result.chunkId}
          href={`/knowledge-base/${result.sourceId}#chunk-${result.chunkIndex}`}
        >
          <Card className="transition-colors hover:bg-accent/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium">
                    {result.source?.title || "Unknown Source"}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {result.source?.sourceType && (
                      <Badge variant="secondary" className="text-xs">
                        {result.source.sourceType}
                      </Badge>
                    )}
                    {result.source?.author && (
                      <span>by {result.source.author}</span>
                    )}
                    {result.source?.captureDate && (
                      <span>
                        {new Date(result.source.captureDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                    {result.snippet}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {(result.score * 100).toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
