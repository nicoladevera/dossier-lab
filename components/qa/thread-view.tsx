"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { AnswerDisplay } from "@/components/qa/answer-display";
import { Citation } from "@/components/qa/citation";
import type { QAThreadMessage } from "@/components/qa/types";
import { nextFeedback } from "@/components/qa/feedback-utils";

interface ThreadViewProps {
  messages: QAThreadMessage[];
  loading: boolean;
  streamingMessageId: string | null;
  feedbackPendingMessageIds: Set<string>;
  onFeedback: (messageId: string, feedback: "GOOD" | "BAD" | null) => void;
}

export function ThreadView({
  messages,
  loading,
  streamingMessageId,
  feedbackPendingMessageIds,
  onFeedback,
}: ThreadViewProps) {
  const citationsRef = useRef<HTMLDivElement>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopy = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  function handleCitationClick(messageId: string, index: number) {
    const selector = `[data-citation-message="${messageId}"][data-citation-index="${index}"]`;
    const element = citationsRef.current?.querySelector(selector);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (messages.length === 0 && loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0 && !loading) {
    return null;
  }

  return (
    <div ref={citationsRef} className="space-y-5">
      {messages.map((message) => {
        if (message.role === "USER") {
          return (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-3xl rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm">
                {message.content}
              </div>
            </div>
          );
        }

        const citations = Array.isArray(message.citations) ? message.citations : [];

        return (
          <div key={message.id} className="space-y-3">
            <AnswerDisplay
              answer={message.content}
              streaming={streamingMessageId === message.id}
              onCitationClick={(index) => handleCitationClick(message.id, index)}
            />

            {message.legacyImported && citations.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Legacy imported response. Citation snapshots were not stored for this answer.
              </p>
            )}

            {citations.length > 0 && (
              <div className="rounded-lg bg-muted/30 p-3 space-y-3">
                <div>
                  <h3 className="text-sm font-medium">Citations</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Set(citations.map((citation) => citation.sourceId)).size} source
                    {new Set(citations.map((citation) => citation.sourceId)).size === 1
                      ? ""
                      : "s"}{" "}
                    cited
                  </p>
                </div>
                {citations.map((citation) => (
                  <div
                    key={`${message.id}-${citation.chunkId}-${citation.index}`}
                    data-citation-message={message.id}
                    data-citation-index={citation.index}
                  >
                    <Citation citation={citation} />
                  </div>
                ))}
              </div>
            )}

            {streamingMessageId !== message.id && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleCopy(message.content, message.id)}
                  title="Copy response"
                >
                  {copiedMessageId === message.id ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant={message.userFeedback === "GOOD" ? "default" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  disabled={feedbackPendingMessageIds.has(message.id)}
                  onClick={() =>
                    onFeedback(message.id, nextFeedback(message.userFeedback, "GOOD"))
                  }
                  title="Good response"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={message.userFeedback === "BAD" ? "default" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  disabled={feedbackPendingMessageIds.has(message.id)}
                  onClick={() =>
                    onFeedback(message.id, nextFeedback(message.userFeedback, "BAD"))
                  }
                  title="Bad response"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
