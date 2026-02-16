"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, FileText, File, FileCode, AlignLeft } from "lucide-react";

const typeIcons: Record<string, React.ElementType> = {
  URL: Globe,
  PDF: File,
  WORD: FileText,
  MARKDOWN: FileCode,
  TEXT: AlignLeft,
};

const typeColors: Record<string, string> = {
  URL: "bg-muted text-muted-foreground",
  PDF: "bg-muted text-muted-foreground",
  WORD: "bg-muted text-muted-foreground",
  MARKDOWN: "bg-muted text-muted-foreground",
  TEXT: "bg-muted text-muted-foreground",
};

interface SourceCardProps {
  source: {
    id: string;
    title: string;
    sourceType: string;
    sourceUrl?: string | null;
    author?: string | null;
    captureDate: string;
    status: string;
    processingProgress: number;
  };
}

export function SourceCard({ source }: SourceCardProps) {
  const Icon = typeIcons[source.sourceType] || FileText;
  const colorClass = typeColors[source.sourceType] || typeColors.TEXT;

  return (
    <Link href={`/knowledge-base/${source.id}`}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium">{source.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className={colorClass}>
                {source.sourceType}
              </Badge>
              {source.author && (
                <span className="truncate">by {source.author}</span>
              )}
              <span className="shrink-0">
                {new Date(source.captureDate).toLocaleDateString()}
              </span>
            </div>
          </div>
          {source.status === "PROCESSING" && (
            <Badge variant="outline">Processing {source.processingProgress}%</Badge>
          )}
          {source.status === "ERROR" && (
            <Badge variant="destructive">Error</Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
