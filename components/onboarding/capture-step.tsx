"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check } from "lucide-react";

interface CaptureStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export function CaptureStep({ onNext, onSkip }: CaptureStepProps) {
  const [url, setUrl] = useState("https://paulgraham.com/do.html");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCapture() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ingest/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(onNext, 1500);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to capture URL");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Add Your First Source</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Paste a URL to an article you want to capture. We have a suggested one
          ready for you.
        </p>
      </div>
      <div className="flex gap-2 max-w-lg mx-auto">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          disabled={loading || success}
        />
        <Button
          onClick={handleCapture}
          disabled={loading || success || !url.trim()}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : success ? (
            <Check className="h-4 w-4" />
          ) : (
            "Capture"
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600 text-center">
          Source captured successfully! Processing...
        </p>
      )}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Skip
        </Button>
      </div>
    </div>
  );
}
