"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface TextPasteFormProps {
  onSuccess?: (sourceId: string) => void;
}

export function TextPasteForm({ onSuccess }: TextPasteFormProps) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!text.trim()) {
      setError("Please enter some text");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/ingest/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          title: title.trim() || undefined,
          sourceUrl: sourceUrl.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save text");
        return;
      }

      setSuccess(true);
      setText("");
      setTitle("");
      setSourceUrl("");
      onSuccess?.(data.source.id);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Input
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
        />
        <Input
          type="url"
          placeholder="Source URL (optional)"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          disabled={loading}
        />
        <Textarea
          placeholder="Paste your text content here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
          rows={10}
          className="min-h-[200px]"
        />
      </div>

      <Button type="submit" disabled={loading || !text.trim()}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Text"
        )}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Text saved successfully! Processing in the background.
          </AlertDescription>
        </Alert>
      )}
    </form>
  );
}
