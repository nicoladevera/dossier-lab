import { LLMProvider } from "./provider";
import { OpenAIProvider } from "./openai-provider";
import { AnthropicProvider } from "./anthropic-provider";

export function createLLMProvider(
  provider: string,
  model: string,
  apiKey: string
): LLMProvider {
  switch (provider.toUpperCase()) {
    case "OPENAI":
      return new OpenAIProvider(apiKey, model);
    case "ANTHROPIC":
      return new AnthropicProvider(apiKey, model);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}
