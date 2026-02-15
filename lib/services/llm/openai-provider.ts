import OpenAI from "openai";
import { LLMProvider, LLMOptions, LLMStreamResult, TokenUsage } from "./provider";

export class OpenAIProvider implements LLMProvider {
  readonly providerName = "openai";
  readonly modelId: string;
  private client: OpenAI;

  constructor(apiKey: string, modelId: string = "gpt-5-mini") {
    this.modelId = modelId;
    this.client = new OpenAI({ apiKey });
  }

  async generateAnswer(
    prompt: string,
    context: string[],
    options?: LLMOptions
  ): Promise<LLMStreamResult> {
    const systemPrompt =
      options?.systemPrompt ||
      "You are a helpful research assistant. Answer the user's question based on the provided context. " +
        "Cite your sources using [1], [2], etc. notation corresponding to the context passages provided. " +
        "Use Markdown formatting for structure (headings, bullet/numbered lists, emphasis) when helpful. " +
        "If the context does not contain relevant information, say so clearly.";

    const contextBlock = context
      .map((c, i) => `[${i + 1}] ${c}`)
      .join("\n\n");

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Context:\n${contextBlock}\n\nQuestion: ${prompt}`,
      },
    ];

    const response = await this.client.chat.completions.create({
      model: this.modelId,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2048,
      stream: true,
      stream_options: { include_usage: true },
    });

    let usage: TokenUsage | null = null;

    async function* streamTokens() {
      for await (const chunk of response) {
        if (chunk.usage) {
          usage = {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
          };
        }
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    }

    return {
      stream: streamTokens(),
      getUsage: () => usage,
    };
  }
}
