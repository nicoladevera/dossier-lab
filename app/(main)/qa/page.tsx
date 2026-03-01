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
import { AlertTriangle, History, MessageSquare, Plus } from "lucide-react";
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
    userFeedback: "GOOD" | "BAD" | null;
    feedbackUpdatedAt: string | null;
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
    userFeedback: message.userFeedback ?? null,
    feedbackUpdatedAt: message.feedbackUpdatedAt ?? null,
  }));
}

export default function QAPage() {
  const [threads, setThreads] = useState<QAThreadSummary[]>([]);
  const [pagination, setPagination] = useState<QAPagination | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThreadTitle, setActiveThreadTitle] = useState<string | null>(null);
  const [messages, setMessages] = useState<QAThreadMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [asking, setAsking] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );

  const [error, setError] = useState<string | null>(null);
  const [budgetWarning, setBudgetWarning] = useState(false);

  const [feedbackPendingMessageIds, setFeedbackPendingMessageIds] = useState<Set<string>>(
    () => new Set()
  );

  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QAThreadSummary | null>(null);

  const [sidebarWidth, setSidebarWidth] = useState<number>(280);
  const [deletingThread, setDeletingThread] = useState(false);
  const [autoSelectThread, setAutoSelectThread] = useState(false);

  const activeThreadIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (userScrolledUp.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingMessageId]);

  const handleMessagesWheel = useCallback((e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      userScrolledUp.current = true;
    } else if (e.deltaY > 0) {
      const el = messagesContainerRef.current;
      if (el) {
        const distanceFromBottom =
          el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distanceFromBottom <= 150) {
          userScrolledUp.current = false;
        }
      }
    }
  }, []);

  // Keep scrolled to bottom during streaming
  useEffect(() => {
    if (!streamingMessageId) return;
    if (userScrolledUp.current) return;  // Respect user's manual scroll
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streamingMessageId]);

  useEffect(() => {
    const saved = localStorage.getItem("qa-sidebar-width");
    if (saved) setSidebarWidth(Math.min(480, Math.max(200, Number(saved))));
  }, []);

  useEffect(() => {
    localStorage.setItem("qa-sidebar-width", String(sidebarWidth));
  }, [sidebarWidth]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebarWidth;

      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        setSidebarWidth(Math.min(480, Math.max(200, startWidth + delta)));
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [sidebarWidth]
  );

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
      setActiveThreadTitle(detail.thread.title);
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
      setFeedbackPendingMessageIds(new Set());
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
    setActiveThreadTitle(null);
    setMessages([]);
    setFeedbackPendingMessageIds(new Set());
    setStreamingMessageId(null);
  }

  async function handleAsk(question: string) {
    if (asking) return;

    userScrolledUp.current = false;  // Reset so new response auto-scrolls
    setAsking(true);
    setError(null);

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
      userFeedback: null,
      feedbackUpdatedAt: null,
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
      userFeedback: null,
      feedbackUpdatedAt: null,
    };

    setMessages((prev) => [...prev, optimisticUserMessage, optimisticAssistantMessage]);
    setStreamingMessageId(tempAssistantMessageId);

    let resolvedThreadId: string | null = activeThreadIdRef.current;
    let resolvedAssistantMessageId: string | null = null;

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

  async function handleFeedback(messageId: string, feedback: "GOOD" | "BAD" | null) {
    const currentMessage = messages.find((message) => message.id === messageId);
    if (!currentMessage || currentMessage.role !== "ASSISTANT") return;

    const previousFeedback = currentMessage.userFeedback;
    const previousFeedbackUpdatedAt = currentMessage.feedbackUpdatedAt;
    const optimisticFeedbackUpdatedAt = new Date().toISOString();

    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? {
              ...message,
              userFeedback: feedback,
              feedbackUpdatedAt: optimisticFeedbackUpdatedAt,
            }
          : message
      )
    );
    setFeedbackPendingMessageIds((prev) => {
      const next = new Set(prev);
      next.add(messageId);
      return next;
    });

    try {
      const response = await fetch(
        `/api/qa/messages/${encodeURIComponent(messageId)}/feedback`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback }),
        }
      );

      if (!response.ok) {
        throw new Error("Feedback request failed");
      }

      const data = (await response.json()) as {
        userFeedback: "GOOD" | "BAD" | null;
        feedbackUpdatedAt: string | null;
      };

      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? {
                ...message,
                userFeedback: data.userFeedback,
                feedbackUpdatedAt: data.feedbackUpdatedAt,
              }
            : message
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? {
                ...message,
                userFeedback: previousFeedback,
                feedbackUpdatedAt: previousFeedbackUpdatedAt,
              }
            : message
        )
      );
    } finally {
      setFeedbackPendingMessageIds((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  }

  async function handleDeleteThread() {
    if (!deleteTarget) return;

    setDeletingThread(true);
    try {
      const response = await fetch(`/api/qa/threads/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to delete thread");
        return;
      }

      if (activeThreadId === deleteTarget.id) {
        setActiveThreadId(null);
        setActiveThreadTitle(null);
        setMessages([]);
        setFeedbackPendingMessageIds(new Set());
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
    <div className="-m-4 lg:-m-6 flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="shrink-0 p-4 pb-0 lg:p-6 lg:pb-0">
        <h2 className="text-2xl font-serif tracking-tight">Q&A</h2>
        <p className="mt-1 text-muted-foreground italic">
          Ask questions about your knowledge base and review chat history
        </p>
      </div>

    <div className="mt-4 flex min-h-0 flex-1 border-t">
      {/* Sidebar (desktop only) */}
      <aside
        className="relative hidden shrink-0 flex-col border-r bg-muted/30 lg:flex"
        style={{ width: sidebarWidth }}
      >
        <div className="p-3">
          <Button onClick={handleNewChat} disabled={asking} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            New chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3">
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
        </div>
        {/* Drag handle */}
        <div
          className="absolute inset-y-0 right-0 w-1 cursor-col-resize select-none hover:bg-primary/20 active:bg-primary/40"
          onMouseDown={handleResizeStart}
        />
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex h-14 shrink-0 items-center gap-2 border-b bg-muted/40 px-4 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="h-4 w-4" />
          </Button>
          <span className="truncate text-base font-semibold">
            {activeThreadTitle || "New conversation"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden"
            onClick={handleNewChat}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Banners */}
        {budgetWarning && (
          <Alert className="mx-4 mt-3 border-border bg-muted/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your estimated daily costs are approaching your budget threshold. You can
              adjust the threshold in Settings.
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="mx-4 mt-3">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Messages area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto bg-muted/20" onWheel={handleMessagesWheel}>
          {messages.length === 0 && !loadingMessages && !asking ? (
            <div className="flex h-full flex-col items-center justify-center text-center px-4">
              <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">What would you like to know?</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Get AI-powered answers with citations from your knowledge base.
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-4">
              <ThreadView
                messages={messages}
                loading={asking || loadingMessages}
                streamingMessageId={streamingMessageId}
                feedbackPendingMessageIds={feedbackPendingMessageIds}
                onFeedback={handleFeedback}
              />
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input (pinned to bottom) */}
        <div className="shrink-0 border-t bg-muted/40 px-4 py-3">
          <div className="mx-auto max-w-3xl">
            <QuestionInput
              onSubmit={handleAsk}
              loading={asking}
              disabled={loadingMessages}
              isNewChat={!activeThreadId}
            />
          </div>
        </div>
      </div>

      {/* Mobile history sheet */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Chat history</SheetTitle>
            <SheetDescription>Review and manage past Q&A threads.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <Button onClick={handleNewChat} disabled={asking} className="mb-3 w-full">
              <Plus className="mr-2 h-4 w-4" />
              New chat
            </Button>
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

      {/* Delete confirmation dialog */}
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
    </div>
  );
}
