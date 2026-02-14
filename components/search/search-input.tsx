"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";

interface SearchInputProps {
  onSearch: (query: string) => void;
  loading?: boolean;
  defaultValue?: string;
  placeholder?: string;
}

export function SearchInput({
  onSearch,
  loading = false,
  defaultValue = "",
  placeholder = "Search your knowledge base...",
}: SearchInputProps) {
  const [query, setQuery] = useState(defaultValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
          disabled={loading}
        />
      </div>
      <Button type="submit" disabled={loading || !query.trim()}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Search"
        )}
      </Button>
    </form>
  );
}
