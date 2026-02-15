import { createLLMProvider } from "./provider-factory";
import { OpenAIProvider } from "./openai-provider";
import { AnthropicProvider } from "./anthropic-provider";

describe("LLM Provider Factory", () => {
  it("creates an OpenAI provider", () => {
    const provider = createLLMProvider("OPENAI", "gpt-5-mini", "test-key");
    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider.providerName).toBe("openai");
    expect(provider.modelId).toBe("gpt-5-mini");
  });

  it("creates an Anthropic provider", () => {
    const provider = createLLMProvider("ANTHROPIC", "claude-sonnet-4-5-20250929", "test-key");
    expect(provider).toBeInstanceOf(AnthropicProvider);
    expect(provider.providerName).toBe("anthropic");
    expect(provider.modelId).toBe("claude-sonnet-4-5-20250929");
  });

  it("handles case-insensitive provider names", () => {
    const provider = createLLMProvider("openai", "gpt-5-mini", "test-key");
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it("throws for unsupported providers", () => {
    expect(() => createLLMProvider("INVALID", "model", "key")).toThrow(
      "Unsupported LLM provider: INVALID"
    );
  });
});

describe("OpenAI Provider", () => {
  it("has correct provider properties", () => {
    const provider = new OpenAIProvider("test-key");
    expect(provider.providerName).toBe("openai");
    expect(provider.modelId).toBe("gpt-5-mini");
  });

  it("accepts custom model ID", () => {
    const provider = new OpenAIProvider("test-key", "gpt-5.2");
    expect(provider.modelId).toBe("gpt-5.2");
  });
});

describe("Anthropic Provider", () => {
  it("has correct provider properties", () => {
    const provider = new AnthropicProvider("test-key");
    expect(provider.providerName).toBe("anthropic");
    expect(provider.modelId).toBe("claude-sonnet-4-5-20250929");
  });

  it("accepts custom model ID", () => {
    const provider = new AnthropicProvider("test-key", "claude-opus-4-6");
    expect(provider.modelId).toBe("claude-opus-4-6");
  });
});
