import { decrypt } from "@/lib/services/encryption";
import {
  EmbeddingProvider,
  OpenAIEmbeddingProvider,
} from "@/lib/services/embedding/embedding-service";

interface OpenAISettingsLike {
  openaiApiKey?: string | null;
}

function resolveStoredOpenAIKey(storedKey: string): string {
  try {
    return decrypt(storedKey);
  } catch {
    // Backward compatibility for plaintext keys stored before encryption.
    return storedKey;
  }
}

export function resolveOpenAIApiKey(settings?: OpenAISettingsLike | null): string {
  if (settings?.openaiApiKey) {
    return resolveStoredOpenAIKey(settings.openaiApiKey);
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
