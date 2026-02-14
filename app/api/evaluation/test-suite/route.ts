import { NextResponse } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hybridSearch } from "@/lib/services/search/hybrid-search";
import { OpenAIEmbeddingProvider } from "@/lib/services/embedding/embedding-service";
import { decrypt } from "@/lib/services/encryption";

// GET: List test cases
export async function GET() {
  try {
    const session = await getRequiredAuthSession();
    const userId = session.user!.id;

    const testCases = await prisma.queryTestCase.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ testCases });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Run test suite or create test case
export async function POST(request: Request) {
  try {
    const session = await getRequiredAuthSession();
    const userId = session.user!.id;
    const body = await request.json();

    // If action is "run", run the test suite
    if (body.action === "run") {
      return runTestSuite(userId);
    }

    // Otherwise, create a test case
    const { query, queryType, goldenSourceIds } = body;

    if (!query || !queryType || !goldenSourceIds) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const testCase = await prisma.queryTestCase.create({
      data: {
        userId,
        query,
        queryType,
        goldenSourceIds,
      },
    });

    return NextResponse.json({ testCase }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function runTestSuite(userId: string) {
  const testCases = await prisma.queryTestCase.findMany({
    where: { userId },
  });

  if (testCases.length === 0) {
    return NextResponse.json(
      { error: "No test cases found" },
      { status: 400 }
    );
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });
  const apiKey =
    (settings?.openaiApiKey ? decrypt(settings.openaiApiKey) : null) ||
    process.env.OPENAI_API_KEY ||
    "";
  const embeddingProvider = new OpenAIEmbeddingProvider(apiKey);

  const results = [];
  let passCount = 0;

  for (const tc of testCases) {
    try {
      const searchResults = await hybridSearch(
        tc.query,
        userId,
        embeddingProvider,
        10
      );

      const retrievedSourceIds = [
        ...new Set(searchResults.map((r) => r.sourceId)),
      ];

      // Check if any golden source was retrieved
      const goldenFound = tc.goldenSourceIds.filter((id: string) =>
        retrievedSourceIds.includes(id)
      );

      const pass =
        tc.queryType === "NEGATIVE"
          ? goldenFound.length === 0 // For negative cases, no golden sources should match
          : goldenFound.length > 0; // For other cases, at least one golden source should match

      if (pass) passCount++;

      results.push({
        id: tc.id,
        query: tc.query,
        queryType: tc.queryType,
        pass,
        goldenSourceIds: tc.goldenSourceIds,
        retrievedSourceIds,
        goldenFound,
      });
    } catch (err) {
      results.push({
        id: tc.id,
        query: tc.query,
        queryType: tc.queryType,
        pass: false,
        error:
          err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    results,
    summary: {
      total: testCases.length,
      passed: passCount,
      failed: testCases.length - passCount,
      passRate: Math.round((passCount / testCases.length) * 100),
    },
  });
}
