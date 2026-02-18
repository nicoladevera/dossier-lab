"use client";

import { Button } from "@/components/ui/button";
import { Settings, KeyRound } from "lucide-react";
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
          One thing left to get started:
        </p>
      </div>

      {/* First Next Step - API Key */}
      <div className="max-w-lg mx-auto">
        <div className="rounded-md border-2 border-primary/50 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h4 className="text-sm font-semibold">Add Your API Key</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Enables content capture and AI Q&amp;A.
          </p>
          <Link href="/settings" onClick={onFinish}>
            <Button size="sm" className="w-full gap-2">
              <Settings className="h-4 w-4" />
              Go to Settings
            </Button>
          </Link>
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
