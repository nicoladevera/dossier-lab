export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface LLMStreamResult {
  stream: AsyncIterable<string>;
  getUsage: () => TokenUsage | null;
}

export interface LLMProvider {
  readonly modelId: string;
  readonly providerName: string;

  generateAnswer(
    prompt: string,
    context: string[],
    options?: LLMOptions
  ): Promise<LLMStreamResult>;
}
