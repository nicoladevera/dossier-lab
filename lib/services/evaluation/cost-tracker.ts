export interface TokenPricing {
  promptPricePerToken: number;
  completionPricePerToken: number;
}

// Pricing per token (in USD) - based on current published rates
const PRICING: Record<string, TokenPricing> = {
  // OpenAI models
  "gpt-5.2": {
    promptPricePerToken: 1.75 / 1_000_000,
    completionPricePerToken: 14.0 / 1_000_000,
  },
  "gpt-5-mini": {
    promptPricePerToken: 0.25 / 1_000_000,
    completionPricePerToken: 2.0 / 1_000_000,
  },
  "gpt-4.1-nano": {
    promptPricePerToken: 0.1 / 1_000_000,
    completionPricePerToken: 0.4 / 1_000_000,
  },
  // Anthropic models
  "claude-sonnet-4-5-20250929": {
    promptPricePerToken: 3.0 / 1_000_000,
    completionPricePerToken: 15.0 / 1_000_000,
  },
  "claude-opus-4-6": {
    promptPricePerToken: 15.0 / 1_000_000,
    completionPricePerToken: 75.0 / 1_000_000,
  },
  "claude-haiku-4-5-20251001": {
    promptPricePerToken: 0.8 / 1_000_000,
    completionPricePerToken: 4.0 / 1_000_000,
  },
  // Embedding model
  "text-embedding-3-small": {
    promptPricePerToken: 0.02 / 1_000_000,
    completionPricePerToken: 0,
  },
};

export function calculateCost(
  modelId: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = PRICING[modelId];
  if (!pricing) {
    // Fallback to gpt-5-mini pricing
    const fallback = PRICING["gpt-5-mini"];
    return (
      promptTokens * fallback.promptPricePerToken +
      completionTokens * fallback.completionPricePerToken
    );
  }
  return (
    promptTokens * pricing.promptPricePerToken +
    completionTokens * pricing.completionPricePerToken
  );
}

export function getPricing(modelId: string): TokenPricing | null {
  return PRICING[modelId] || null;
}
