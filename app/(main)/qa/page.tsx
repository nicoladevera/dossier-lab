"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QuestionInput } from "@/components/qa/question-input";
import { ThreadList } from "@/components/qa/thread-list";
import { ThreadView } from "@/components/qa/thread-view";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AlertTriangle, History, Plus } from "lucide-react";
import type { CitationData } from "@/components/qa/citation";
import type {
  QAPagination,
  QAThreadMessage,
  QAThreadSummary,
} from "@/components/qa/types";

interface ThreadListResponse {
  threads: QAThreadSummary[];
  pagination: QAPagination;
}

interface ThreadDetailResponse {
  thread: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  };
  messages: Array<{
    id: string;
    role: "USER" | "ASSISTANT";
    content: string;
    citations: unknown;
    noContext: boolean;
    legacyImported: boolean;
    createdAt: string;
    evaluationId: string | null;
  }>;
}

interface BackfillResponse {
  scanned: number;
  imported: number;
  failed: number;
  remaining: number;
  done: boolean;
}

interface AskJsonResponse {
  answer: string;
  citations: CitationData[];
  noContext: boolean;
  threadId: string;
  assistantMessageId: string;
}

function normalizeMessages(
  rawMessages: ThreadDetailResponse["messages"]
): QAThreadMessage[] {
  return rawMessages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    citations: Array.isArray(message.citations)
      ? (message.citations as CitationData[])
      : null,
    noContext: message.noContext,
    legacyImported: message.legacyImported,
    createdAt: message.createdAt,
    evaluationId: message.evaluationId,
  }));
}

export default function QAPage() {
  const [threads, setThreads] = useState<QAThreadSummary[]>([]);
  const [pagination, setPagination] = useState<QAPagination | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<QAThreadMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [asking, setAsking] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );

  const [error, setError] = useState<string | null>(null);
  const [budgetWarning, setBudgetWarning] = useState(false);

  const [feedback, setFeedback] = useState<"GOOD" | "BAD" | null>(null);
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null);
  const [feedbackEvaluationId, setFeedbackEvaluationId] = useState<string | null>(
    null
  );

  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QAThreadSummary | null>(null);
  const [deletingThread, setDeletingThread] = useState(false);
  const [autoSelectThread, setAutoSelectThread] = useState(true);

  const activeThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  const fetchThreads = useCallback(async (page: number) => {
    setLoadingThreads(true);
    try {
      const response = await fetch(`/api/qa/threads?page=${page}&limit=20`);
      const data = (await response.json()) as ThreadListResponse;

      if (!response.ok) {
        setError("Failed to load chat history");
        return;
      }

      setThreads(data.threads);
      setPagination(data.pagination);
    } catch {
      setError("Failed to load chat history");
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  const fetchThreadDetail = useCallback(async (threadId: string) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/qa/threads/${threadId}`);
      const data = (await response.json()) as ThreadDetailResponse | { error: string };

      if (!response.ok) {
        setError((data as { error: string }).error || "Failed to load thread");
        return;
      }

      const detail = data as ThreadDetailResponse;
      setMessages(normalizeMessages(detail.messages));
      setActiveThreadId(threadId);
    } catch {
      setError("Failed to load thread");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

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

  useEffect(() => {
    void fetchThreads(1);
  }, [fetchThreads]);

  useEffect(() => {
    if (!autoSelectThread || activeThreadId || threads.length === 0 || asking) {
      return;
    }

    const firstThread = threads[0];
    setAutoSelectThread(false);
    setError(null);
    void fetchThreadDetail(firstThread.id);
  }, [activeThreadId, asking, autoSelectThread, fetchThreadDetail, threads]);

  useEffect(() => {
    let cancelled = false;

    async function runBackfill() {
      let importedAny = false;

      for (let i = 0; i < 20; i++) {
        if (cancelled) return;

        const response = await fetch("/api/qa/threads/backfill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 100 }),
        });

        if (!response.ok) {
          break;
        }

        const data = (await response.json()) as BackfillResponse;
        if (data.imported > 0) {
          importedAny = true;
        }

        if (data.done || data.scanned === 0) {
          break;
        }
      }

      if (!cancelled && importedAny) {
        await fetchThreads(1);
      }
    }

    void runBackfill();

    return () => {
      cancelled = true;
    };
  }, [fetchThreads]);

  const handleSelectThread = useCallback(
    async (threadId: string) => {
      if (asking) return;

      setAutoSelectThread(false);
      setError(null);
      setFeedback(null);
      setFeedbackEvaluationId(null);
      setFeedbackMessageId(null);
      setHistoryOpen(false);

      await fetchThreadDetail(threadId);
    },
    [asking, fetchThreadDetail]
  );

  function handleNewChat() {
    if (asking) return;

    setAutoSelectThread(false);
    setHistoryOpen(false);
    setError(null);
    setActiveThreadId(null);
    setMessages([]);
    setFeedback(null);
    setFeedbackEvaluationId(null);
    setFeedbackMessageId(null);
    setStreamingMessageId(null);
  }

  async function handleAsk(question: string) {
    if (asking) return;

    setAsking(true);
    setError(null);
    setFeedback(null);
    setFeedbackEvaluationId(null);
    setFeedbackMessageId(null);

    const tempUserMessageId = `temp-user-${Date.now()}`;
    const tempAssistantMessageId = `temp-assistant-${Date.now()}`;

    const optimisticUserMessage: QAThreadMessage = {
      id: tempUserMessageId,
      role: "USER",
      content: question,
      citations: null,
      noContext: false,
      legacyImported: false,
      createdAt: new Date().toISOString(),
      evaluationId: null,
    };

    const optimisticAssistantMessage: QAThreadMessage = {
      id: tempAssistantMessageId,
      role: "ASSISTANT",
      content: "",
      citations: [],
      noContext: false,
      legacyImported: false,
      createdAt: new Date().toISOString(),
      evaluationId: null,
    };

    setMessages((prev) => [...prev, optimisticUserMessage, optimisticAssistantMessage]);
    setStreamingMessageId(tempAssistantMessageId);

    let resolvedThreadId: string | null = activeThreadIdRef.current;
    let resolvedAssistantMessageId: string | null = null;
    let resolvedEvaluationId: string | null = null;

    try {
      const response = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, threadId: activeThreadIdRef.current }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to get answer");
        setMessages((prev) =>
          prev.filter(
            (message) =>
              message.id !== tempAssistantMessageId &&
              message.id !== tempUserMessageId
          )
        );
        setStreamingMessageId(null);
        await fetchThreads(1);
        return;
      }

      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        const data = (await response.json()) as AskJsonResponse;
        resolvedThreadId = data.threadId;
        resolvedAssistantMessageId = data.assistantMessageId;

        setMessages((prev) =>
          prev.map((message) => {
            if (message.id === tempAssistantMessageId) {
              return {
                ...message,
                id: data.assistantMessageId,
                content: data.answer,
                citations: data.citations,
                noContext: data.noContext,
              };
            }
            return message;
          })
        );

        setStreamingMessageId(null);
        setActiveThreadId(data.threadId);
        await fetchThreads(1);
        await fetchThreadDetail(data.threadId);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError("Failed to read response");
        setMessages((prev) =>
          prev.filter((message) => message.id !== tempAssistantMessageId)
        );
        setStreamingMessageId(null);
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
            const event = JSON.parse(jsonStr) as {
              type: string;
              citations?: CitationData[];
              content?: string;
              message?: string;
              evaluationId?: string;
              threadId?: string;
              assistantMessageId?: string;
            };

            switch (event.type) {
              case "citations":
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === tempAssistantMessageId
                      ? {
                          ...message,
                          citations: event.citations || [],
                        }
                      : message
                  )
                );
                break;
              case "token":
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === tempAssistantMessageId
                      ? {
                          ...message,
                          content: message.content + (event.content || ""),
                        }
                      : message
                  )
                );
                break;
              case "done":
                resolvedThreadId = event.threadId || resolvedThreadId;
                resolvedAssistantMessageId =
                  event.assistantMessageId || resolvedAssistantMessageId;
                resolvedEvaluationId = event.evaluationId || resolvedEvaluationId;
                if (event.threadId) {
                  setActiveThreadId(event.threadId);
                }
                break;
              case "error":
                setError(event.message || "Generation failed");
                break;
            }
          } catch {
            // Ignore malformed stream event
          }
        }
      }

      if (resolvedAssistantMessageId) {
        const assistantId = resolvedAssistantMessageId;
        setMessages((prev) =>
          prev.map((message) =>
            message.id === tempAssistantMessageId
              ? { ...message, id: assistantId }
              : message
          )
        );
      }

      setStreamingMessageId(null);

      if (resolvedAssistantMessageId && resolvedEvaluationId) {
        setFeedbackMessageId(resolvedAssistantMessageId);
        setFeedbackEvaluationId(resolvedEvaluationId);
      }

      await fetchThreads(1);
      if (resolvedThreadId) {
        await fetchThreadDetail(resolvedThreadId);
      }
    } catch {
      setError("Network error. Please try again.");
      setMessages((prev) =>
        prev.filter(
          (message) =>
            message.id !== tempAssistantMessageId &&
            message.id !== tempUserMessageId
        )
      );
      setStreamingMessageId(null);
    } finally {
      setAsking(false);
    }
  }

  async function handleFeedback(type: "GOOD" | "BAD") {
    if (!feedbackEvaluationId) return;

    setFeedback(type);
    try {
      await fetch("/api/evaluation/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluationId: feedbackEvaluationId, feedback: type }),
      });
    } catch {
      // Non-critical
    }
  }

  async function handleDeleteThread() {
    if (!deleteTarget) return;

    setDeletingThread(true);
    try {
      const response = await fetch(`/api/qa/threads/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to delete thread");
        return;
      }

      if (activeThreadId === deleteTarget.id) {
        setActiveThreadId(null);
        setMessages([]);
        setFeedback(null);
        setFeedbackMessageId(null);
        setFeedbackEvaluationId(null);
        setAutoSelectThread(false);
      }

      await fetchThreads(1);
    } catch {
      setError("Failed to delete thread");
    } finally {
      setDeletingThread(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Q&A</h2>
        <p className="mt-1 text-muted-foreground">
          Ask questions about your knowledge base and review chat history
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

      <div className="flex items-center gap-2 lg:hidden">
        <Button onClick={handleNewChat} disabled={asking}>
          <Plus className="mr-2 h-4 w-4" />
          New chat
        </Button>
        <Button
          variant="outline"
          onClick={() => setHistoryOpen(true)}
          disabled={asking}
        >
          <History className="mr-2 h-4 w-4" />
          History
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden space-y-3 lg:block">
          <Button className="w-full" onClick={handleNewChat} disabled={asking}>
            <Plus className="mr-2 h-4 w-4" />
            New chat
          </Button>
          <ThreadList
            threads={threads}
            pagination={pagination}
            loading={loadingThreads}
            disabled={asking}
            activeThreadId={activeThreadId}
            onSelect={handleSelectThread}
            onDelete={(thread) => setDeleteTarget(thread)}
            onPageChange={(page) => {
              void fetchThreads(page);
            }}
          />
        </aside>

        <section className="min-w-0 space-y-4">
          <QuestionInput
            onSubmit={handleAsk}
            loading={asking}
            disabled={loadingMessages}
          />

          <ThreadView
            messages={messages}
            loading={asking || loadingMessages}
            streamingMessageId={streamingMessageId}
            feedbackMessageId={feedbackMessageId}
            feedback={feedback}
            onFeedback={handleFeedback}
          />
        </section>
      </div>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Chat history</SheetTitle>
            <SheetDescription>Review and manage past Q&A threads.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <ThreadList
              threads={threads}
              pagination={pagination}
              loading={loadingThreads}
              disabled={asking}
              activeThreadId={activeThreadId}
              onSelect={(threadId) => {
                void handleSelectThread(threadId);
              }}
              onDelete={(thread) => {
                setHistoryOpen(false);
                setDeleteTarget(thread);
              }}
              onPageChange={(page) => {
                void fetchThreads(page);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chat thread?</DialogTitle>
            <DialogDescription>
              This permanently deletes the chat history and associated evaluation
              records for this thread.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deletingThread}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void handleDeleteThread();
              }}
              disabled={deletingThread}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
