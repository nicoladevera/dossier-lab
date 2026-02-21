"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

interface SourceFiltersProps {
  sort: "newest" | "oldest";
  typeFilter: string | null;
  onSortChange: (sort: "newest" | "oldest") => void;
  onTypeFilterChange: (type: string | null) => void;
}

export function SourceFilters({
  sort,
  typeFilter,
  onSortChange,
  onTypeFilterChange,
}: SourceFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={typeFilter || "all"}
        onValueChange={(v) => onTypeFilterChange(v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="URL">URL</SelectItem>
          <SelectItem value="PDF">PDF</SelectItem>
          <SelectItem value="WORD">Word</SelectItem>
          <SelectItem value="MARKDOWN">Markdown</SelectItem>
          <SelectItem value="TEXT">Text</SelectItem>
          <SelectItem value="YOUTUBE">YouTube</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onSortChange(sort === "newest" ? "oldest" : "newest")}
        className="flex items-center gap-1"
      >
        <ArrowUpDown className="h-4 w-4" />
        {sort === "newest" ? "Newest first" : "Oldest first"}
      </Button>
    </div>
  );
}
