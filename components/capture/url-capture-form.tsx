"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface UrlCaptureFormProps {
  onSuccess?: (sourceId: string) => void;
  onSwitchToText?: () => void;
}

export function UrlCaptureForm({ onSuccess, onSwitchToText }: UrlCaptureFormProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setWarning(null);
    setSuccess(false);

    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/ingest/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to capture URL");
        if (data.error?.includes("paywall") || data.error?.includes("paste")) {
          // Show hint to switch to text paste
        }
        return;
      }

      if (data.warning) {
        setWarning(data.warning);
      }

      setSuccess(true);
      setUrl("");
      onSuccess?.(data.source.id);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="https://example.com/article"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          className="flex-1"
        />
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Capturing...
            </>
          ) : (
            "Capture"
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            {error.includes("paywall") || error.includes("paste") ? (
              <Button
                variant="link"
                className="ml-1 h-auto p-0"
                onClick={onSwitchToText}
              >
                Try pasting the content instead.
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      )}

      {warning && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      )}

      {success && !warning && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Content captured successfully! Processing in the background.
          </AlertDescription>
        </Alert>
      )}
    </form>
  );
}
