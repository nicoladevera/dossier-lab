import { prisma } from "@/lib/db";

interface SeedTestCase {
  query: string;
  queryType: "FACTUAL" | "CROSS_SOURCE" | "SPECIFIC_RECALL" | "NEGATIVE";
  goldenSourceIds: string[]; // To be populated once real sources are ingested
}

// Template test set. goldenSourceIds are placeholders that should be
// updated to reference actual source IDs from the user's knowledge base.
const TEST_SET_TEMPLATES: SeedTestCase[] = [
  // Factual retrieval (5-8 queries)
  { query: "What is the main argument presented in the first article?", queryType: "FACTUAL", goldenSourceIds: [] },
  { query: "Who is the author of the document about technology trends?", queryType: "FACTUAL", goldenSourceIds: [] },
  { query: "What statistics were mentioned about market growth?", queryType: "FACTUAL", goldenSourceIds: [] },
  { query: "When was the research paper published?", queryType: "FACTUAL", goldenSourceIds: [] },
  { query: "What methodology was used in the study?", queryType: "FACTUAL", goldenSourceIds: [] },
  { query: "What conclusions did the author reach?", queryType: "FACTUAL", goldenSourceIds: [] },

  // Cross-source synthesis (8-10 queries)
  { query: "How do different sources compare in their views on AI?", queryType: "CROSS_SOURCE", goldenSourceIds: [] },
  { query: "What common themes emerge across the articles about productivity?", queryType: "CROSS_SOURCE", goldenSourceIds: [] },
  { query: "How do the recommendations from multiple sources complement each other?", queryType: "CROSS_SOURCE", goldenSourceIds: [] },
  { query: "What are the conflicting opinions across my sources on this topic?", queryType: "CROSS_SOURCE", goldenSourceIds: [] },
  { query: "Summarize the key insights about innovation from all sources", queryType: "CROSS_SOURCE", goldenSourceIds: [] },
  { query: "What timeline of events can be constructed from multiple articles?", queryType: "CROSS_SOURCE", goldenSourceIds: [] },
  { query: "How has the narrative around this topic evolved across different sources?", queryType: "CROSS_SOURCE", goldenSourceIds: [] },
  { query: "What evidence from different sources supports this claim?", queryType: "CROSS_SOURCE", goldenSourceIds: [] },
  { query: "Compare the approaches described in the two most recent articles", queryType: "CROSS_SOURCE", goldenSourceIds: [] },

  // Specific source recall (5-7 queries)
  { query: "What did the Paul Graham essay say about startups?", queryType: "SPECIFIC_RECALL", goldenSourceIds: [] },
  { query: "What were the three key points in the uploaded PDF?", queryType: "SPECIFIC_RECALL", goldenSourceIds: [] },
  { query: "Summarize the article I saved from the technology blog", queryType: "SPECIFIC_RECALL", goldenSourceIds: [] },
  { query: "What examples were given in the document about leadership?", queryType: "SPECIFIC_RECALL", goldenSourceIds: [] },
  { query: "What framework was proposed in the research paper?", queryType: "SPECIFIC_RECALL", goldenSourceIds: [] },
  { query: "What case studies were discussed in the business article?", queryType: "SPECIFIC_RECALL", goldenSourceIds: [] },

  // Negative/boundary cases (3-5 queries)
  { query: "What is the recipe for chocolate cake?", queryType: "NEGATIVE", goldenSourceIds: [] },
  { query: "What is the weather forecast for next week?", queryType: "NEGATIVE", goldenSourceIds: [] },
  { query: "Who won the 2024 Super Bowl?", queryType: "NEGATIVE", goldenSourceIds: [] },
  { query: "How do I reset my router password?", queryType: "NEGATIVE", goldenSourceIds: [] },
];

export async function seedTestSet(userId: string): Promise<number> {
  // Check if user already has test cases
  const existing = await prisma.queryTestCase.count({
    where: { userId },
  });

  if (existing > 0) {
    return existing;
  }

  // Create test cases
  const created = await prisma.queryTestCase.createMany({
    data: TEST_SET_TEMPLATES.map((tc) => ({
      userId,
      query: tc.query,
      queryType: tc.queryType,
      goldenSourceIds: tc.goldenSourceIds,
    })),
  });

  return created.count;
}
