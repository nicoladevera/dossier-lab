"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QuestionInput } from "@/components/qa/question-input";
import { AnswerDisplay } from "@/components/qa/answer-display";
import { Citation, CitationData } from "@/components/qa/citation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, ThumbsUp, ThumbsDown, AlertTriangle } from "lucide-react";

export default function QAPage() {
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<CitationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noContext, setNoContext] = useState(false);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [budgetWarning, setBudgetWarning] = useState(false);
  const citationsRef = useRef<HTMLDivElement>(null);

  const uniqueSourceCount = useMemo(
    () => new Set(citations.map((citation) => citation.sourceId)).size,
    [citations]
  );

  // Check budget warning
  useEffect(() => {
    fetch("/api/evaluation/metrics")
      .then((r) => r.json())
      .then((data) => {
        if (data.budgetWarning) {
          setBudgetWarning(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleAsk = useCallback(async (question: string) => {
    setLoading(true);
    setAnswer("");
    setCitations([]);
    setError(null);
    setNoContext(false);
    setEvaluationId(null);
    setFeedback(null);

    try {
      const response = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to get answer");
        setLoading(false);
        return;
      }

      // Check if it's a non-streaming JSON response (no context case)
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = await response.json();
        setAnswer(data.answer);
        setNoContext(data.noContext || false);
        setLoading(false);
        return;
      }

      // Handle SSE stream
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
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);
            switch (event.type) {
              case "citations":
                setCitations(event.citations);
                break;
              case "token":
                setAnswer((prev) => prev + event.content);
                break;
              case "done":
                if (event.evaluationId) {
                  setEvaluationId(event.evaluationId);
                }
                break;
              case "error":
                setError(event.message);
                break;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleCitationClick(index: number) {
    const element = citationsRef.current?.querySelector(
      `[data-citation-index="${index}"]`
    );
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleFeedback(type: "GOOD" | "BAD") {
    if (!evaluationId) return;
    setFeedback(type);
    try {
      await fetch("/api/evaluation/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluationId, feedback: type }),
      });
    } catch {
      // Silently fail - feedback is non-critical
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Q&A</h2>
        <p className="text-muted-foreground mt-1">
          Ask questions about your knowledge base and get answers with citations
        </p>
      </div>

      {budgetWarning && (
        <Alert className="border-border bg-muted/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your estimated daily costs are approaching your budget threshold. You can
            adjust the threshold in Settings.
          </AlertDescription>
        </Alert>
      )}

      <QuestionInput onSubmit={handleAsk} loading={loading} />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {(answer || loading) && (
        <AnswerDisplay
          answer={answer}
          streaming={loading}
          onCitationClick={handleCitationClick}
        />
      )}

      {answer && !loading && !noContext && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Was this helpful?</span>
          <Button
            variant={feedback === "GOOD" ? "default" : "outline"}
            size="sm"
            className="h-7"
            onClick={() => handleFeedback("GOOD")}
          >
            <ThumbsUp className="mr-1 h-3 w-3" />
            Good
          </Button>
          <Button
            variant={feedback === "BAD" ? "default" : "outline"}
            size="sm"
            className="h-7"
            onClick={() => handleFeedback("BAD")}
          >
            <ThumbsDown className="mr-1 h-3 w-3" />
            Bad
          </Button>
        </div>
      )}

      {citations.length > 0 && (
        <div ref={citationsRef} className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">Citations</h3>
            <p className="text-xs text-muted-foreground">
              {uniqueSourceCount} source{uniqueSourceCount === 1 ? "" : "s"} cited
            </p>
          </div>
          {citations.map((citation) => (
            <div key={citation.chunkId} data-citation-index={citation.index}>
              <Citation citation={citation} />
            </div>
          ))}
        </div>
      )}

      {!answer && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">Ask a question</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md">
            Ask questions about the content in your knowledge base. Answers will
            include citations to your sources.
          </p>
        </div>
      )}
    </div>
  );
}
