"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { AnswerDisplay } from "@/components/qa/answer-display";
import { Citation } from "@/components/qa/citation";
import type { QAThreadMessage } from "@/components/qa/types";

interface ThreadViewProps {
  messages: QAThreadMessage[];
  loading: boolean;
  streamingMessageId: string | null;
  feedbackMessageId: string | null;
  feedback: "GOOD" | "BAD" | null;
  onFeedback: (type: "GOOD" | "BAD") => void;
}

export function ThreadView({
  messages,
  loading,
  streamingMessageId,
  feedbackMessageId,
  feedback,
  onFeedback,
}: ThreadViewProps) {
  const citationsRef = useRef<HTMLDivElement>(null);

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

            {feedbackMessageId === message.id && !loading && message.evaluationId && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Was this helpful?</span>
                <Button
                  variant={feedback === "GOOD" ? "default" : "outline"}
                  size="sm"
                  className="h-7"
                  onClick={() => onFeedback("GOOD")}
                >
                  <ThumbsUp className="mr-1 h-3 w-3" />
                  Good
                </Button>
                <Button
                  variant={feedback === "BAD" ? "default" : "outline"}
                  size="sm"
                  className="h-7"
                  onClick={() => onFeedback("BAD")}
                >
                  <ThumbsDown className="mr-1 h-3 w-3" />
                  Bad
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
