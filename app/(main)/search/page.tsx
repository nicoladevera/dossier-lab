"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchInput } from "@/components/search/search-input";
import { SearchResults } from "@/components/search/search-results";
import { Search } from "lucide-react";

interface SearchResultItem {
  sourceId: string;
  chunkId: string;
  chunkIndex: number;
  matchCount: number;
  score: number;
  snippet: string;
  source: {
    id: string;
    title: string;
    sourceType: string;
    sourceUrl?: string | null;
    author?: string | null;
    captureDate: string;
  } | null;
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [results, setResults] = useState<SearchResultItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastExecutedQueryRef = useRef<string | null>(null);
  const activeRequestIdRef = useRef(0);

  const executeSearch = useCallback(async (searchQuery: string) => {
    const requestId = ++activeRequestIdRef.current;
    setLoading(true);
    setError(null);
    setQuery(searchQuery);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();

      if (!response.ok) {
        if (requestId === activeRequestIdRef.current) {
          setError(data.error || "Search failed");
        }
        return;
      }

      if (requestId === activeRequestIdRef.current) {
        setResults(data.results);
      }
    } catch {
      if (requestId === activeRequestIdRef.current) {
        setError("Network error. Please try again.");
      }
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const queryFromUrl = (searchParams.get("q") || "").trim();

  useEffect(() => {
    if (!queryFromUrl) {
      activeRequestIdRef.current += 1;
      setResults(null);
      setQuery("");
      setError(null);
      lastExecutedQueryRef.current = null;
      return;
    }

    if (lastExecutedQueryRef.current === queryFromUrl) {
      return;
    }

    lastExecutedQueryRef.current = queryFromUrl;
    void executeSearch(queryFromUrl);
  }, [executeSearch, queryFromUrl]);

  function handleSearch(searchQuery: string) {
    if (lastExecutedQueryRef.current !== searchQuery) {
      lastExecutedQueryRef.current = searchQuery;
      void executeSearch(searchQuery);
    }

    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif tracking-tight">Search</h2>
        <p className="text-muted-foreground mt-1">
          Find information across your knowledge base
        </p>
      </div>

      <SearchInput
        onSearch={handleSearch}
        loading={loading}
        defaultValue={queryFromUrl}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {results !== null ? (
        <SearchResults results={results} query={query} />
      ) : (
        !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Search your knowledge base</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter a query to search across all your captured sources using
              semantic and keyword search.
            </p>
          </div>
        )
      )}
    </div>
  );
}
