"use client";

import { useState } from "react";
import { SearchInput } from "@/components/search/search-input";
import { SearchResults } from "@/components/search/search-results";
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

export default function SearchPage() {
  const [results, setResults] = useState<SearchResultItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(searchQuery: string) {
    setLoading(true);
    setError(null);
    setQuery(searchQuery);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Search failed");
        return;
      }

      setResults(data.results);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Search</h2>
        <p className="text-muted-foreground mt-1">
          Find information across your knowledge base
        </p>
      </div>

      <SearchInput onSearch={handleSearch} loading={loading} />

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
