"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, FileText, CheckCircle } from "lucide-react";

interface CaptureStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export function CaptureStep({ onNext, onSkip }: CaptureStepProps) {
  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Capture Content</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Add articles, documents, and web pages to your knowledge base.
        </p>
      </div>

      {/* Visual example of capturing */}
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex gap-2">
          <Input
            value="https://techinsights.example/building-rag-systems"
            disabled
            className="bg-muted"
          />
          <Button disabled className="gap-2">
            <Globe className="h-4 w-4" />
            Capture
          </Button>
        </div>

        {/* Mock capture process */}
        <div className="rounded-md border p-4 space-y-3 bg-muted/30">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Content extracted</p>
              <p className="text-xs text-muted-foreground">
                The page is processed and split into searchable chunks
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Ready to search & query</p>
              <p className="text-xs text-muted-foreground">
                Your content is indexed and ready for questions
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          This is a preview. Set up your API key in Settings to try it for real.
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
