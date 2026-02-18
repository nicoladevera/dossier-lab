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
        <div className="rounded-md border p-4 space-y-3 bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-foreground" />
            <span>AI Answer</span>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Answers drawn from your captured sources</li>
            <li>Grounded in what you&apos;ve read</li>
            <li>Cited back to the original article</li>
          </ul>
        </div>
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
