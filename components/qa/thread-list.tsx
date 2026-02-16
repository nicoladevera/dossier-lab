"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThreadItem } from "@/components/qa/thread-item";
import type { QAPagination, QAThreadSummary } from "@/components/qa/types";

interface ThreadListProps {
  threads: QAThreadSummary[];
  pagination: QAPagination | null;
  loading: boolean;
  disabled?: boolean;
  activeThreadId: string | null;
  onSelect: (threadId: string) => void;
  onDelete: (thread: QAThreadSummary) => void;
  onPageChange: (page: number) => void;
}

export function ThreadList({
  threads,
  pagination,
  loading,
  disabled = false,
  activeThreadId,
  onSelect,
  onDelete,
  onPageChange,
}: ThreadListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {threads.length === 0 ? (
        <p className="text-sm text-muted-foreground">No chat history yet.</p>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              active={thread.id === activeThreadId}
              disabled={disabled}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
