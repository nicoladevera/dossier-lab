"use client";

import { Button } from "@/components/ui/button";
import { Library, BarChart3, Settings, KeyRound } from "lucide-react";
import Link from "next/link";

interface ExploreStepProps {
  onFinish: () => void;
}

export function ExploreStep({ onFinish }: ExploreStepProps) {
  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Ready to Get Started!</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          First, configure your API key, then explore these features:
        </p>
      </div>

      {/* First Next Step - API Key */}
      <div className="max-w-lg mx-auto">
        <div className="rounded-md border-2 border-primary/50 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h4 className="text-sm font-semibold">First Step: Add Your API Key</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure your OpenAI API key in Settings to enable content capture,
            embeddings, and AI-powered Q&A.
          </p>
          <Link href="/settings" onClick={onFinish}>
            <Button size="sm" className="w-full gap-2">
              <Settings className="h-4 w-4" />
              Go to Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Other Features */}
      <div className="grid gap-4 max-w-lg mx-auto sm:grid-cols-2">
        <div className="rounded-md border p-4 space-y-2">
          <Library className="h-5 w-5 text-primary" />
          <h4 className="text-sm font-medium">Knowledge Base</h4>
          <p className="text-xs text-muted-foreground">
            View, search, and manage all your captured sources in one place.
          </p>
        </div>
        <div className="rounded-md border p-4 space-y-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h4 className="text-sm font-medium">Evaluation Dashboard</h4>
          <p className="text-xs text-muted-foreground">
            Monitor retrieval accuracy, groundedness, and cost metrics over time.
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <Button variant="outline" onClick={onFinish}>
          Finish Tour
        </Button>
      </div>
    </div>
  );
}
