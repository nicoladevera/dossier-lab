"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSourceStatusLabel, type SourceSummary } from "@/lib/sources/source-status";
import {
  Globe,
  FileText,
  File,
  FileCode,
  AlignLeft,
  Youtube,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const typeIcons: Record<string, React.ElementType> = {
  URL: Globe,
  PDF: File,
  WORD: FileText,
  MARKDOWN: FileCode,
  TEXT: AlignLeft,
  YOUTUBE: Youtube,
};

interface SourceCardProps {
  source: SourceSummary;
  variant?: "default" | "live";
}

export function SourceCard({ source, variant = "default" }: SourceCardProps) {
  const Icon = typeIcons[source.sourceType] || FileText;
  const statusLabel = getSourceStatusLabel(source);
  const isProcessing = source.status === "PROCESSING";
  const isLive = variant === "live";
  const progressWidth = `${Math.max(8, Math.min(source.processingProgress, 100))}%`;

  return (
    <Link href={`/knowledge-base/${source.id}`}>
      <Card
        className={`transition-colors hover:bg-accent/50 ${
          isLive ? "border-primary/20 bg-muted/20" : ""
        }`}
      >
        <CardContent
          className={`flex gap-4 p-4 ${
            isLive ? "flex-col sm:flex-row sm:items-center" : "items-center"
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium">{source.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                {source.sourceType}
              </Badge>
              {source.author ? <span className="truncate">by {source.author}</span> : null}
              <span className="shrink-0">
                {new Date(source.captureDate).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className={isLive ? "w-full sm:w-60" : "shrink-0"}>
            <div
              className={`flex items-center gap-2 ${
                isLive ? "justify-between" : "justify-end"
              }`}
            >
              {isProcessing ? (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {statusLabel}
                </Badge>
              ) : null}
              {source.status === "ERROR" ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {statusLabel}
                </Badge>
              ) : null}
              {source.status === "READY" && isLive ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {statusLabel}
                </Badge>
              ) : null}
            </div>
            {isLive && isProcessing ? (
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: progressWidth }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  This source will move into the knowledge base automatically when it
                  is ready.
                </p>
              </div>
            ) : null}
            {isLive && source.status === "READY" ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Added successfully. It will stay in recent activity for a few seconds.
              </p>
            ) : null}
            {isLive && source.status === "ERROR" && source.errorMessage ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {source.errorMessage}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
