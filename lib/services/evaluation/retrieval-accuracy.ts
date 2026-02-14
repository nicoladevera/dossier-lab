import { LLMProvider } from "@/lib/services/llm/provider";

export async function scoreRetrievalAccuracy(
  query: string,
  retrievedChunks: Array<{ content: string }>,
  llmProvider: LLMProvider
): Promise<number[]> {
  if (retrievedChunks.length === 0) return [];

  const prompt = `You are evaluating retrieval quality. Given a query and retrieved passages, rate each passage's relevance to the query on a scale of 0.0 to 1.0.

Query: ${query}

${retrievedChunks.map((c, i) => `Passage ${i + 1}: ${c.content}`).join("\n\n")}

Return ONLY a JSON array of numbers (one per passage), e.g. [0.8, 0.3, 0.9]
Do not include any other text.`;

  const { stream } = await llmProvider.generateAnswer(prompt, [], {
    temperature: 0,
    maxTokens: 256,
    systemPrompt:
      "You are a precise evaluator. Return only the JSON array requested.",
  });

  let response = "";
  for await (const token of stream) {
    response += token;
  }

  try {
    // Extract JSON array from response
    const match = response.match(/\[[\d.,\s]+\]/);
    if (!match) return retrievedChunks.map(() => 0.5);
    const scores = JSON.parse(match[0]) as number[];
    return scores.map((s) => Math.max(0, Math.min(1, s)));
  } catch {
    return retrievedChunks.map(() => 0.5);
  }
}
