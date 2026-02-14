"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Sparkles } from "lucide-react";

interface QueryStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export function QueryStep({ onNext, onSkip }: QueryStepProps) {
  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Ask Questions</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Get AI-powered answers based on your captured content.
        </p>
      </div>

      {/* Visual example of Q&A */}
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex gap-2">
          <Input
            value="What are the main challenges in production RAG systems?"
            disabled
            className="bg-muted"
          />
          <Button disabled className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Ask
          </Button>
        </div>

        {/* Mock answer */}
        <div className="rounded-md border p-4 space-y-3 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span>AI Answer</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Production RAG systems face three critical challenges: retrieval quality,
            answer groundedness, and cost management. Teams must balance chunk size and
            overlap for optimal context retrieval, implement evaluation frameworks to
            measure whether answers are factually grounded in source material, and
            optimize embedding/LLM costs as usage scales. The most successful implementations
            treat RAG as a product iteration problem—continuously measuring retrieval
            precision, testing chunking strategies, and monitoring hallucination rates.
          </p>
          <p className="text-xs text-muted-foreground italic">
            Answers are grounded in your captured sources with citations.
          </p>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          This is a preview. Set up your API key in Settings to ask real questions.
        </p>
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Skip
        </Button>
        <Button size="sm" onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}
