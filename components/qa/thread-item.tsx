"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { QAThreadSummary } from "@/components/qa/types";
import { cn } from "@/lib/utils";

interface ThreadItemProps {
  thread: QAThreadSummary;
  active: boolean;
  disabled?: boolean;
  onSelect: (threadId: string) => void;
  onDelete: (thread: QAThreadSummary) => void;
}

export function ThreadItem({
  thread,
  active,
  disabled = false,
  onSelect,
  onDelete,
}: ThreadItemProps) {
  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded-md border p-2",
        active ? "border-primary bg-primary/5" : "border-border"
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(thread.id)}
        className="min-w-0 flex-1 text-left"
      >
        <div className="truncate text-sm font-medium">{thread.title}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {thread.messageCount} message{thread.messageCount === 1 ? "" : "s"}
        </div>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        className="h-7 w-7 p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => onDelete(thread)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
