"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface QueryStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export function QueryStep({ onNext, onSkip }: QueryStepProps) {
  const [query, setQuery] = useState("What is the main idea of this article?");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer("");

    try {
      const response = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to get answer");
        setLoading(false);
        return;
      }

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = await response.json();
        setAnswer(data.answer);
        setLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError("Failed to read response");
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6).trim());
            if (event.type === "token") {
              setAnswer((prev) => prev + event.content);
            }
          } catch {
            // Skip
          }
        }
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
        <h3 className="text-lg font-semibold">Ask Your First Question</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Try asking a question about the content you just captured.
        </p>
      </div>
      <div className="flex gap-2 max-w-lg mx-auto">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question..."
          disabled={loading}
        />
        <Button onClick={handleAsk} disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
      {answer && (
        <div className="max-w-lg mx-auto rounded-md border p-4 text-sm leading-relaxed">
          {answer}
        </div>
      )}
      <div className="flex justify-center gap-3">
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Skip
        </Button>
        {answer && (
          <Button size="sm" onClick={onNext}>
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}
