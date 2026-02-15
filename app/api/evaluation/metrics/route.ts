import { NextRequest, NextResponse } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredAuthSession();
    const userId = session.user!.id;

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7", 10);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const evaluations = await prisma.evaluation.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "asc" },
    });

    // Calculate aggregate metrics
    const totalEvals = evaluations.length;

    let avgRetrievalAccuracy = 0;
    let avgGroundedness = 0;
    let avgLatency = 0;
    let totalCost = 0;
    let retrievalCount = 0;
    let groundednessCount = 0;

    for (const ev of evaluations) {
      if (ev.retrievalScores) {
        const scores = ev.retrievalScores as number[];
        if (scores.length > 0) {
          avgRetrievalAccuracy +=
            scores.reduce((a, b) => a + b, 0) / scores.length;
          retrievalCount++;
        }
      }
      if (ev.groundednessScore !== null) {
        avgGroundedness += ev.groundednessScore;
        groundednessCount++;
      }
      avgLatency += ev.latencyMs;
      totalCost += ev.costUsd;
    }

    if (retrievalCount > 0) avgRetrievalAccuracy /= retrievalCount;
    if (groundednessCount > 0) avgGroundedness /= groundednessCount;
    if (totalEvals > 0) avgLatency /= totalEvals;

    // Group by day for trend data
    const dailyMetrics: Record<
      string,
      {
        date: string;
        retrievalAccuracy: number;
        groundedness: number;
        count: number;
        retrievalCount: number;
        groundednessCount: number;
        latencyMsSum: number;
        cost: number;
      }
    > = {};

    for (const ev of evaluations) {
      const dateKey = ev.createdAt.toISOString().split("T")[0];
      if (!dailyMetrics[dateKey]) {
        dailyMetrics[dateKey] = {
          date: dateKey,
          retrievalAccuracy: 0,
          groundedness: 0,
          count: 0,
          retrievalCount: 0,
          groundednessCount: 0,
          latencyMsSum: 0,
          cost: 0,
        };
      }
      const dm = dailyMetrics[dateKey];
      dm.count++;
      dm.cost += ev.costUsd;
      dm.latencyMsSum += ev.latencyMs;

      if (ev.retrievalScores) {
        const scores = ev.retrievalScores as number[];
        if (scores.length > 0) {
          dm.retrievalAccuracy +=
            scores.reduce((a, b) => a + b, 0) / scores.length;
          dm.retrievalCount++;
        }
      }
      if (ev.groundednessScore !== null) {
        dm.groundedness += ev.groundednessScore;
        dm.groundednessCount++;
      }
    }

    const trend = Object.values(dailyMetrics).map((dm) => ({
      date: dm.date,
      retrievalAccuracy:
        dm.retrievalCount > 0 ? dm.retrievalAccuracy / dm.retrievalCount : 0,
      groundedness:
        dm.groundednessCount > 0
          ? dm.groundedness / dm.groundednessCount
          : 0,
      queries: dm.count,
      retrievalScoredQueries: dm.retrievalCount,
      groundednessScoredQueries: dm.groundednessCount,
      retrievalScoredPct: dm.count > 0 ? dm.retrievalCount / dm.count : 0,
      groundednessScoredPct:
        dm.count > 0 ? dm.groundednessCount / dm.count : 0,
      avgLatencyMs: dm.count > 0 ? Math.round(dm.latencyMsSum / dm.count) : 0,
      cost: dm.cost,
    }));

    // Check budget warning
    const todayKey = new Date().toISOString().split("T")[0];
    const todayCost = dailyMetrics[todayKey]?.cost || 0;
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });
    const threshold = settings ? Number(settings.dailyCostThreshold) : 2.0;
    const budgetWarning = todayCost >= threshold * 0.8;

    // Feedback stats
    const goodCount = evaluations.filter(
      (e: { userFeedback: string | null }) => e.userFeedback === "GOOD"
    ).length;
    const badCount = evaluations.filter(
      (e: { userFeedback: string | null }) => e.userFeedback === "BAD"
    ).length;

    return NextResponse.json({
      totalQueries: totalEvals,
      avgRetrievalAccuracy:
        retrievalCount > 0 ? Math.round(avgRetrievalAccuracy * 100) : null,
      avgGroundedness:
        groundednessCount > 0 ? Math.round(avgGroundedness * 100) : null,
      avgLatencyMs: Math.round(avgLatency),
      totalCost: Math.round(totalCost * 10000) / 10000,
      retrievalEvaluatedQueries: retrievalCount,
      groundednessEvaluatedQueries: groundednessCount,
      trend,
      budgetWarning,
      todayCost: Math.round(todayCost * 10000) / 10000,
      dailyThreshold: threshold,
      feedback: { good: goodCount, bad: badCount },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Metrics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
