"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricsChart } from "@/components/evaluation/metrics-chart";
import { HealthChart } from "@/components/evaluation/health-chart";
import { OperationalChart } from "@/components/evaluation/operational-chart";
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
    avgLatencyMs: number;
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
  const [healthMetrics, setHealthMetrics] = useState<MetricsData | null>(null);
  const [operationalMetrics, setOperationalMetrics] = useState<MetricsData | null>(
    null
  );
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [operationalLoading, setOperationalLoading] = useState(true);
  const [testCasesLoading, setTestCasesLoading] = useState(true);
  const [metricsDays, setMetricsDays] = useState(7);
  const [healthDays, setHealthDays] = useState(7);
  const [operationalDays, setOperationalDays] = useState(7);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillSummary, setBackfillSummary] = useState<{
    updated: number;
    failed: number;
    remaining: number;
  } | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);

  const fetchMetricsForWindow = useCallback(
    async (
      days: number,
      setter: (data: MetricsData) => void,
      setLoadingState: (value: boolean) => void
    ) => {
      setLoadingState(true);
      try {
        const response = await fetch(`/api/evaluation/metrics?days=${days}`);
        const data = (await response.json()) as MetricsData;
        if (response.ok) setter(data);
      } catch {
        console.error("Failed to fetch evaluation metrics");
      } finally {
        setLoadingState(false);
      }
    },
    []
  );

  const fetchTestCases = useCallback(async () => {
    setTestCasesLoading(true);
    try {
      const testCasesRes = await fetch("/api/evaluation/test-suite");
      const testCasesData = await testCasesRes.json();
      if (testCasesRes.ok) setTestCases(testCasesData.testCases || []);
    } catch {
      console.error("Failed to fetch evaluation test cases");
    } finally {
      setTestCasesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetricsForWindow(metricsDays, setMetrics, setMetricsLoading);
  }, [fetchMetricsForWindow, metricsDays]);

  useEffect(() => {
    fetchMetricsForWindow(healthDays, setHealthMetrics, setHealthLoading);
  }, [fetchMetricsForWindow, healthDays]);

  useEffect(() => {
    fetchMetricsForWindow(
      operationalDays,
      setOperationalMetrics,
      setOperationalLoading
    );
  }, [fetchMetricsForWindow, operationalDays]);

  useEffect(() => {
    fetchTestCases();
  }, [fetchTestCases]);

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
      await Promise.all([
        fetchMetricsForWindow(metricsDays, setMetrics, setMetricsLoading),
        fetchMetricsForWindow(healthDays, setHealthMetrics, setHealthLoading),
        fetchMetricsForWindow(
          operationalDays,
          setOperationalMetrics,
          setOperationalLoading
        ),
      ]);
    } catch (err) {
      setBackfillError(
        err instanceof Error ? err.message : "Backfill failed unexpectedly"
      );
    } finally {
      setBackfilling(false);
    }
  }

  const loading =
    metricsLoading || healthLoading || operationalLoading || testCasesLoading;
  const backfillMetrics = healthMetrics || metrics;

  const hasMissingScores = Boolean(
    backfillMetrics &&
      (backfillMetrics.retrievalEvaluatedQueries < backfillMetrics.totalQueries ||
        backfillMetrics.groundednessEvaluatedQueries < backfillMetrics.totalQueries)
  );
  const retrievalCoveragePct = healthMetrics
    ? healthMetrics.totalQueries > 0
      ? Math.round(
          (healthMetrics.retrievalEvaluatedQueries / healthMetrics.totalQueries) * 100
        )
      : null
    : null;
  const groundednessCoveragePct = healthMetrics
    ? healthMetrics.totalQueries > 0
      ? Math.round(
          (healthMetrics.groundednessEvaluatedQueries /
            healthMetrics.totalQueries) *
            100
        )
      : null
    : null;
  const retrievalMissing = healthMetrics
    ? Math.max(
        healthMetrics.totalQueries - healthMetrics.retrievalEvaluatedQueries,
        0
      )
    : 0;
  const groundednessMissing = healthMetrics
    ? Math.max(
        healthMetrics.totalQueries - healthMetrics.groundednessEvaluatedQueries,
        0
      )
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
              {metrics?.totalQueries ?? 0} queries in {metricsDays}d
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
            <p className="text-xs text-muted-foreground">
              Last {metricsDays} days
            </p>
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
              <ThumbsUp className="h-4 w-4 text-foreground" />
              <span className="text-sm font-medium">
                {metrics.feedback.good}
              </span>
              <span className="text-xs text-muted-foreground">Good</span>
            </div>
            <div className="flex items-center gap-2">
              <ThumbsDown className="h-4 w-4 text-foreground" />
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
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Metrics Trend</CardTitle>
            <p className="text-xs text-muted-foreground">
              Daily retrieval quality and answer groundedness
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant={metricsDays === 7 ? "default" : "outline"}
              size="sm"
              onClick={() => setMetricsDays(7)}
            >
              7d
            </Button>
            <Button
              variant={metricsDays === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setMetricsDays(30)}
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
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Evaluation Health</CardTitle>
            <p className="text-xs text-muted-foreground">
              Scoring coverage and missing-score status
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant={healthDays === 7 ? "default" : "outline"}
              size="sm"
              onClick={() => setHealthDays(7)}
            >
              7d
            </Button>
            <Button
              variant={healthDays === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setHealthDays(30)}
            >
              30d
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                Retrieval Scored Coverage
              </p>
              <p className="text-lg font-semibold">
                {retrievalCoveragePct !== null ? `${retrievalCoveragePct}%` : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">
                {healthMetrics?.retrievalEvaluatedQueries ?? 0} of{" "}
                {healthMetrics?.totalQueries ?? 0} queries
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
              <p className="text-xs text-muted-foreground">
                {healthMetrics?.groundednessEvaluatedQueries ?? 0} of{" "}
                {healthMetrics?.totalQueries ?? 0} answers
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Missing Scores</p>
              <p className="text-lg font-semibold">
                R:{retrievalMissing} / G:{groundednessMissing}
              </p>
            </div>
          </div>

          <HealthChart data={healthMetrics?.trend || []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-sm font-medium">
              Operational Trend
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Daily query volume, average latency, and cost
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant={operationalDays === 7 ? "default" : "outline"}
              size="sm"
              onClick={() => setOperationalDays(7)}
            >
              7d
            </Button>
            <Button
              variant={operationalDays === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setOperationalDays(30)}
            >
              30d
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                Queries ({operationalDays}d)
              </p>
              <p className="text-lg font-semibold">
                {operationalMetrics?.totalQueries ?? 0}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Avg Latency</p>
              <p className="text-lg font-semibold">
                {operationalMetrics?.avgLatencyMs
                  ? `${(operationalMetrics.avgLatencyMs / 1000).toFixed(1)}s`
                  : "N/A"}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="text-lg font-semibold">
                ${operationalMetrics?.totalCost?.toFixed(4) ?? "0.00"}
              </p>
            </div>
          </div>

          <OperationalChart data={operationalMetrics?.trend || []} />
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
