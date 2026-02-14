"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play, Check, X } from "lucide-react";

interface TestCase {
  id: string;
  query: string;
  queryType: string;
  goldenSourceIds: string[];
}

interface TestResult {
  id: string;
  query: string;
  queryType: string;
  pass: boolean;
  goldenSourceIds?: string[];
  retrievedSourceIds?: string[];
  goldenFound?: string[];
  error?: string;
}

interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

interface TestSuiteRunnerProps {
  testCases: TestCase[];
}

export function TestSuiteRunner({ testCases }: TestSuiteRunnerProps) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [summary, setSummary] = useState<TestSuiteSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);
    setResults(null);
    setSummary(null);

    try {
      const response = await fetch("/api/evaluation/test-suite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Test suite run failed");
        return;
      }

      setResults(data.results);
      setSummary(data.summary);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Test Suite</h3>
          <p className="text-xs text-muted-foreground">
            {testCases.length} test cases
          </p>
        </div>
        <Button
          onClick={handleRun}
          disabled={running || testCases.length === 0}
          size="sm"
        >
          {running ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Run Tests
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{summary.passRate}%</div>
              <p className="text-xs text-muted-foreground">Pass Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {summary.passed}
              </div>
              <p className="text-xs text-muted-foreground">Passed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {summary.failed}
              </div>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {results && (
        <div className="space-y-2">
          {results.map((result) => (
            <div
              key={result.id}
              className="flex items-start gap-3 rounded-md border p-3"
            >
              {result.pass ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              ) : (
                <X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm">{result.query}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {result.queryType}
                  </Badge>
                  {result.error && (
                    <span className="text-xs text-destructive">
                      {result.error}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!results && testCases.length > 0 && (
        <div className="space-y-2">
          {testCases.map((tc) => (
            <div
              key={tc.id}
              className="flex items-start gap-3 rounded-md border p-3"
            >
              <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{tc.query}</p>
                <Badge variant="outline" className="mt-1 text-xs">
                  {tc.queryType}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {testCases.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No test cases yet. Test cases can be added via the API.
        </p>
      )}
    </div>
  );
}
