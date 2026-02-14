"use client";

import { Button } from "@/components/ui/button";
import { Library } from "lucide-react";

interface WelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export function WelcomeStep({ onNext, onSkip }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8">
      <div className="rounded-full bg-primary/10 p-4">
        <Library className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Welcome to Dossier AI</h2>
        <p className="text-muted-foreground max-w-md">
          Transform your reading into a searchable, synthesizable knowledge base.
        </p>
        <p className="text-sm text-muted-foreground max-w-md pt-2">
          Take a quick tour to see what you can do with Dossier AI.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onSkip}>
          Skip Tour
        </Button>
        <Button onClick={onNext}>Start Tour</Button>
      </div>
    </div>
  );
}
