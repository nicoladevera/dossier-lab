import { decrypt } from "@/lib/services/encryption";
import {
  EmbeddingProvider,
  OpenAIEmbeddingProvider,
} from "@/lib/services/embedding/embedding-service";

interface OpenAISettingsLike {
  openaiApiKey?: string | null;
}

export function resolveOpenAIApiKey(settings?: OpenAISettingsLike | null): string {
  if (settings?.openaiApiKey) {
    try {
      return decrypt(settings.openaiApiKey);
    } catch {
      console.error(
        "Failed to decrypt stored OpenAI API key. The user should re-enter their key in Settings."
      );
      return "";
    }
  }

  return process.env.OPENAI_API_KEY || "";
}

export function createOpenAIEmbeddingProvider(
  settings?: OpenAISettingsLike | null
): EmbeddingProvider | null {
  const apiKey = resolveOpenAIApiKey(settings);

  if (!apiKey) {
    return null;
  }

  return new OpenAIEmbeddingProvider(apiKey);
}
