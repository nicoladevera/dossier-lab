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
  URL: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  PDF: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  WORD: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  MARKDOWN: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  TEXT: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
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
