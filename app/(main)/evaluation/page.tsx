"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricsChart } from "@/components/evaluation/metrics-chart";
import { TestSuiteRunner } from "@/components/evaluation/test-suite-runner";
import { Separator } from "@/components/ui/separator";
import {
  Target,
  Shield,
  Clock,
  DollarSign,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

interface MetricsData {
  totalQueries: number;
  avgRetrievalAccuracy: number;
  avgGroundedness: number;
  avgLatencyMs: number;
  totalCost: number;
  trend: Array<{
    date: string;
    retrievalAccuracy: number;
    groundedness: number;
    queries: number;
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

export default function EvaluationPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    async function fetchData() {
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
    }
    fetchData();
  }, [days]);

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
              {metrics?.avgRetrievalAccuracy ?? 0}%
            </div>
            <p className="text-xs text-muted-foreground">
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
              {metrics?.avgGroundedness ?? 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Claim support rate
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
    </div>
  );
}
