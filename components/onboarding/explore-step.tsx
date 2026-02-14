"use client";

import { Button } from "@/components/ui/button";
import { Library, BarChart3 } from "lucide-react";

interface ExploreStepProps {
  onFinish: () => void;
}

export function ExploreStep({ onFinish }: ExploreStepProps) {
  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">You are all set!</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Here are some key features to explore:
        </p>
      </div>
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
        <Button onClick={onFinish}>Finish</Button>
      </div>
    </div>
  );
}
