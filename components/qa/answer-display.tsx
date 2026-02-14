"use client";

import { Fragment } from "react";
import { Loader2 } from "lucide-react";
import { CitationInline } from "./citation";

interface AnswerDisplayProps {
  answer: string;
  streaming?: boolean;
  onCitationClick?: (index: number) => void;
}

export function AnswerDisplay({ answer, streaming, onCitationClick }: AnswerDisplayProps) {
  if (!answer && !streaming) return null;

  // Parse the answer to find citation markers like [1], [2], etc.
  const parts = answer.split(/(\[\d+\])/g);

  return (
    <div className="rounded-lg border p-4">
      <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
        {parts.map((part, i) => {
          const citationMatch = part.match(/^\[(\d+)\]$/);
          if (citationMatch) {
            const index = parseInt(citationMatch[1], 10);
            return (
              <CitationInline
                key={i}
                index={index}
                onClick={() => onCitationClick?.(index)}
              />
            );
          }
          return <Fragment key={i}>{part}</Fragment>;
        })}
        {streaming && (
          <Loader2 className="inline-block ml-1 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
