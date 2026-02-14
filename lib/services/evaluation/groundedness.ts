import { LLMProvider } from "@/lib/services/llm/provider";

export async function scoreGroundedness(
  answer: string,
  citedPassages: string[],
  llmProvider: LLMProvider
): Promise<number> {
  if (!answer || citedPassages.length === 0) return 0;

  const prompt = `You are evaluating answer groundedness. Determine what fraction of claims in the answer are supported by the provided source passages.

Answer: ${answer}

Source Passages:
${citedPassages.map((p, i) => `[${i + 1}] ${p}`).join("\n\n")}

Return ONLY a single number between 0.0 and 1.0 representing the groundedness score.
- 1.0 means every claim is fully supported by the sources
- 0.0 means no claims are supported
Do not include any other text.`;

  const { stream } = await llmProvider.generateAnswer(prompt, [], {
    temperature: 0,
    maxTokens: 64,
    systemPrompt:
      "You are a precise evaluator. Return only the number requested.",
  });

  let response = "";
  for await (const token of stream) {
    response += token;
  }

  try {
    const match = response.match(/(\d+\.?\d*)/);
    if (!match) return 0.5;
    return Math.max(0, Math.min(1, parseFloat(match[1])));
  } catch {
    return 0.5;
  }
}
