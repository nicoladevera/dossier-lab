import Anthropic from "@anthropic-ai/sdk";
import { LLMProvider, LLMOptions, LLMStreamResult, TokenUsage } from "./provider";

export class AnthropicProvider implements LLMProvider {
  readonly providerName = "anthropic";
  readonly modelId: string;
  private client: Anthropic;

  constructor(apiKey: string, modelId: string = "claude-sonnet-4-5-20250929") {
    this.modelId = modelId;
    this.client = new Anthropic({ apiKey });
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
        "If the context does not contain relevant information, say so clearly.";

    const contextBlock = context
      .map((c, i) => `[${i + 1}] ${c}`)
      .join("\n\n");

    const userMessage = `Context:\n${contextBlock}\n\nQuestion: ${prompt}`;

    let usage: TokenUsage | null = null;

    const stream = this.client.messages.stream({
      model: this.modelId,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.3,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    async function* streamTokens() {
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield event.delta.text;
        }
      }
      const finalMessage = await stream.finalMessage();
      usage = {
        promptTokens: finalMessage.usage.input_tokens,
        completionTokens: finalMessage.usage.output_tokens,
      };
    }

    return {
      stream: streamTokens(),
      getUsage: () => usage,
    };
  }
}
