"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricsChart } from "@/components/evaluation/metrics-chart";
import { HealthChart } from "@/components/evaluation/health-chart";
import { TestSuiteRunner } from "@/components/evaluation/test-suite-runner";
import { Separator } from "@/components/ui/separator";
import {
  Target,
  Shield,
  Clock,
  DollarSign,
  ThumbsUp,
  ThumbsDown,
  Loader2,
} from "lucide-react";

interface MetricsData {
  totalQueries: number;
  avgRetrievalAccuracy: number | null;
  avgGroundedness: number | null;
  avgLatencyMs: number;
  totalCost: number;
  retrievalEvaluatedQueries: number;
  groundednessEvaluatedQueries: number;
  trend: Array<{
    date: string;
    retrievalAccuracy: number;
    groundedness: number;
    queries: number;
    retrievalScoredQueries: number;
    groundednessScoredQueries: number;
    retrievalScoredPct: number;
    groundednessScoredPct: number;
    cost: number;
  }>;
  feedback: { good: number; bad: number };
}

interface TestCase {
  id: string;
  query: string;
  queryType: string;
  goldenSourceIds: string[];
}

interface BackfillResponse {
  scanned: number;
  updated: number;
  failed: number;
  pendingBefore: number;
  remaining: number;
  done: boolean;
}

export default function EvaluationPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillSummary, setBackfillSummary] = useState<{
    updated: number;
    failed: number;
    remaining: number;
  } | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, testCasesRes] = await Promise.all([
        fetch(`/api/evaluation/metrics?days=${days}`),
        fetch("/api/evaluation/test-suite"),
      ]);
      const metricsData = await metricsRes.json();
      const testCasesData = await testCasesRes.json();

      if (metricsRes.ok) setMetrics(metricsData);
      if (testCasesRes.ok) setTestCases(testCasesData.testCases || []);
    } catch {
      console.error("Failed to fetch evaluation data");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleBackfill() {
    setBackfilling(true);
    setBackfillSummary(null);
    setBackfillError(null);

    let totalUpdated = 0;
    let totalFailed = 0;
    let remaining = 0;

    try {
      // Run in batches to avoid long single requests.
      for (let i = 0; i < 20; i++) {
        const res = await fetch("/api/evaluation/backfill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 10 }),
        });

        const data = (await res.json()) as BackfillResponse | { error?: string };
        if (!res.ok) {
          throw new Error(
            (data as { error?: string }).error || "Backfill request failed"
          );
        }

        const batch = data as BackfillResponse;
        totalUpdated += batch.updated;
        totalFailed += batch.failed;
        remaining = batch.remaining;

        if (batch.done || batch.scanned === 0) {
          break;
        }
      }

      setBackfillSummary({
        updated: totalUpdated,
        failed: totalFailed,
        remaining,
      });
      await fetchData();
    } catch (err) {
      setBackfillError(
        err instanceof Error ? err.message : "Backfill failed unexpectedly"
      );
    } finally {
      setBackfilling(false);
    }
  }

  const hasMissingScores = Boolean(
    metrics &&
      (metrics.retrievalEvaluatedQueries < metrics.totalQueries ||
        metrics.groundednessEvaluatedQueries < metrics.totalQueries)
  );
  const retrievalCoveragePct = metrics
    ? metrics.totalQueries > 0
      ? Math.round((metrics.retrievalEvaluatedQueries / metrics.totalQueries) * 100)
      : null
    : null;
  const groundednessCoveragePct = metrics
    ? metrics.totalQueries > 0
      ? Math.round(
          (metrics.groundednessEvaluatedQueries / metrics.totalQueries) * 100
        )
      : null
    : null;
  const retrievalMissing = metrics
    ? Math.max(metrics.totalQueries - metrics.retrievalEvaluatedQueries, 0)
    : 0;
  const groundednessMissing = metrics
    ? Math.max(metrics.totalQueries - metrics.groundednessEvaluatedQueries, 0)
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Evaluation</h2>
        <p className="text-muted-foreground mt-1">
          Monitor retrieval accuracy, groundedness, and cost metrics
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Retrieval Accuracy
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.avgRetrievalAccuracy !== null &&
              metrics?.avgRetrievalAccuracy !== undefined
                ? `${metrics.avgRetrievalAccuracy}%`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.retrievalEvaluatedQueries ?? 0} scored of{" "}
              {metrics?.totalQueries ?? 0} queries in {days}d
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Groundedness</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.avgGroundedness !== null &&
              metrics?.avgGroundedness !== undefined
                ? `${metrics.avgGroundedness}%`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.groundednessEvaluatedQueries ?? 0} scored answers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.avgLatencyMs
                ? `${(metrics.avgLatencyMs / 1000).toFixed(1)}s`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Question to answer
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics?.totalCost?.toFixed(4) ?? "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Last {days} days</p>
          </CardContent>
        </Card>
      </div>

      {/* User feedback summary */}
      {metrics && (metrics.feedback.good > 0 || metrics.feedback.bad > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              User Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">
                {metrics.feedback.good}
              </span>
              <span className="text-xs text-muted-foreground">Good</span>
            </div>
            <div className="flex items-center gap-2">
              <ThumbsDown className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">
                {metrics.feedback.bad}
              </span>
              <span className="text-xs text-muted-foreground">Bad</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Metrics Trend</CardTitle>
          <div className="flex gap-1">
            <Button
              variant={days === 7 ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(7)}
            >
              7d
            </Button>
            <Button
              variant={days === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(30)}
            >
              30d
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <MetricsChart data={metrics?.trend || []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Evaluation Health</CardTitle>
          <p className="text-xs text-muted-foreground">
            Daily query volume and scoring coverage
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Queries ({days}d)</p>
              <p className="text-lg font-semibold">{metrics?.totalQueries ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                Retrieval Scored Coverage
              </p>
              <p className="text-lg font-semibold">
                {retrievalCoveragePct !== null ? `${retrievalCoveragePct}%` : "N/A"}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                Groundedness Scored Coverage
              </p>
              <p className="text-lg font-semibold">
                {groundednessCoveragePct !== null
                  ? `${groundednessCoveragePct}%`
                  : "N/A"}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Missing Scores</p>
              <p className="text-lg font-semibold">
                R:{retrievalMissing} / G:{groundednessMissing}
              </p>
            </div>
          </div>

          <HealthChart data={metrics?.trend || []} />
        </CardContent>
      </Card>

      <Separator />

      {/* Test suite */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Regression Test Suite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TestSuiteRunner testCases={testCases} />
        </CardContent>
      </Card>

      {hasMissingScores && (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Backfill Missing Scores</p>
              <p className="text-xs text-muted-foreground">
                One-time recovery for historical rows that were logged before scoring was enabled.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleBackfill}
                disabled={backfilling}
                size="sm"
                variant="secondary"
              >
                {backfilling ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Run Backfill
              </Button>
              {backfillSummary && (
                <p className="text-xs text-muted-foreground">
                  Updated {backfillSummary.updated}, failed {backfillSummary.failed}, remaining {backfillSummary.remaining}
                </p>
              )}
            </div>
          </CardContent>
          {backfillError && (
            <CardContent className="pt-0">
              <p className="text-xs text-destructive">{backfillError}</p>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
