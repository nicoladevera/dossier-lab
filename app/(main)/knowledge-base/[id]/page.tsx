"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ArrowUp, Trash2, ExternalLink, Globe, FileText, File, FileCode, AlignLeft, Youtube } from "lucide-react";

const typeIcons: Record<string, React.ElementType> = {
  URL: Globe,
  PDF: File,
  WORD: FileText,
  MARKDOWN: FileCode,
  TEXT: AlignLeft,
  YOUTUBE: Youtube,
};

interface SourceDetail {
  id: string;
  title: string;
  sourceType: string;
  sourceUrl?: string | null;
  author?: string | null;
  publicationDate?: string | null;
  captureDate: string;
  content: string;
  metadata?: Record<string, unknown> | null;
  status: string;
  processingProgress: number;
  chunks: Array<{
    id: string;
    chunkIndex: number;
    content: string;
  }>;
}

const MIN_OVERLAP_TRIM = 20;
const MAX_OVERLAP_CHECK = 200;

function trimChunkOverlap(previous: string, current: string): string {
  const maxOverlap = Math.min(
    previous.length,
    current.length,
    MAX_OVERLAP_CHECK
  );

  for (let len = maxOverlap; len >= MIN_OVERLAP_TRIM; len--) {
    if (previous.slice(-len) === current.slice(0, len)) {
      return current.slice(len).trimStart();
    }
  }

  return current;
}

export default function SourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [source, setSource] = useState<SourceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setShowScrollTop(window.scrollY > 300);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const displayChunks = useMemo(() => {
    if (!source || source.chunks.length === 0) {
      return [];
    }

    const sortedChunks = [...source.chunks].sort(
      (a, b) => a.chunkIndex - b.chunkIndex
    );

    return sortedChunks.map((chunk, index) => ({
      ...chunk,
      displayContent:
        index === 0
          ? chunk.content
          : trimChunkOverlap(sortedChunks[index - 1].content, chunk.content),
    }));
  }, [source]);

  useEffect(() => {
    async function fetchSource() {
      try {
        const response = await fetch(`/api/sources/${params.id}`);
        const data = await response.json();
        if (response.ok) {
          setSource(data.source);
        }
      } catch (err) {
        console.error("Failed to fetch source:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSource();
  }, [params.id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/sources/${params.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        router.push("/knowledge-base");
      }
    } catch (err) {
      console.error("Failed to delete source:", err);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!source) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">Source not found</h3>
        <Button variant="link" onClick={() => router.push("/knowledge-base")}>
          Back to Knowledge Base
        </Button>
      </div>
    );
  }

  const Icon = typeIcons[source.sourceType] || FileText;
  const ytMeta = source.sourceType === "YOUTUBE" && source.metadata
    ? (source.metadata as Record<string, unknown>)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="mt-1 shrink-0" onClick={() => router.push("/knowledge-base")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold tracking-tight break-words">{source.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Icon className="h-3 w-3" />
              {source.sourceType}
            </Badge>
            {source.sourceUrl && (
              <a
                href={source.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Original
              </a>
            )}
            {source.author && <span>by {source.author}</span>}
            <span className="shrink-0">{new Date(source.captureDate).toLocaleDateString()}</span>
            {source.status === "PROCESSING" && (
              <Badge variant="outline">Processing {source.processingProgress}%</Badge>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {ytMeta && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {!!ytMeta.thumbnailUrl && (
                <a
                  href={source.sourceUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block shrink-0 overflow-hidden rounded-lg"
                >
                  <img
                    src={ytMeta.thumbnailUrl as string}
                    alt={source.title}
                    className="w-full sm:w-64 rounded-lg transition-opacity hover:opacity-80"
                  />
                </a>
              )}
              <div className="flex flex-col justify-center gap-1">
                {!!ytMeta.channel && (
                  <p className="text-sm text-muted-foreground">
                    Channel: <span className="font-medium text-foreground">{String(ytMeta.channel)}</span>
                  </p>
                )}
                {source.sourceUrl && (
                  <a
                    href={source.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Watch on YouTube
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      {source.metadata && Object.keys(source.metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {source.sourceUrl && (
                <>
                  <dt className="text-muted-foreground">Source URL</dt>
                  <dd className="truncate">
                    <a
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {source.sourceUrl}
                    </a>
                  </dd>
                </>
              )}
              {source.publicationDate && (
                <>
                  <dt className="text-muted-foreground">Published</dt>
                  <dd>{new Date(source.publicationDate).toLocaleDateString()}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Captured</dt>
              <dd>{new Date(source.captureDate).toLocaleString()}</dd>
              <dt className="text-muted-foreground">Chunks</dt>
              <dd>{source.chunks.length}</dd>
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Content with chunk anchors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Content</CardTitle>
        </CardHeader>
        <CardContent>
          {source.chunks.length > 0 ? (
            <div className="space-y-4">
              {displayChunks.map((chunk) => (
                <div
                  key={chunk.id}
                  id={`chunk-${chunk.chunkIndex}`}
                  className="scroll-mt-20 rounded-md border-l-2 border-transparent p-3 text-sm leading-relaxed target:border-primary target:bg-primary/5"
                >
                  <p className="whitespace-pre-wrap">{chunk.displayContent}</p>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="prose dark:prose-invert max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: source.content }}
            />
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end py-2">
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive shrink-0">
              <Trash2 className="mr-1 h-4 w-4" />
              Delete source
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete source?</DialogTitle>
              <DialogDescription>
                This will permanently delete &quot;{source.title}&quot; and all associated chunks.
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {showScrollTop && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-28 right-6 z-50 rounded-full shadow-md animate-in fade-in slide-in-from-bottom-2 duration-200"
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
