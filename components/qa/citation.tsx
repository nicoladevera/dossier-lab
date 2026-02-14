"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

export interface CitationData {
  index: number;
  chunkId: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  passageCount: number;
  source: {
    id: string;
    title: string;
    sourceType: string;
    sourceUrl?: string | null;
  } | null;
}

interface CitationProps {
  citation: CitationData;
}

export function Citation({ citation }: CitationProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="secondary" className="shrink-0">
            [{citation.index}]
          </Badge>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">
              {citation.source?.title || "Unknown source"}
            </div>
            <div className="text-xs text-muted-foreground">
              {citation.passageCount} supporting passage
              {citation.passageCount === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href={`/knowledge-base/${citation.sourceId}#chunk-${citation.chunkIndex}`}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="mt-2 rounded bg-muted/50 p-2">
          <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {citation.content}
          </p>
        </div>
      )}
    </div>
  );
}

interface CitationInlineProps {
  index: number;
  onClick?: () => void;
}

export function CitationInline({ index, onClick }: CitationInlineProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center rounded bg-primary/10 px-1 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
    >
      [{index}]
    </button>
  );
}
