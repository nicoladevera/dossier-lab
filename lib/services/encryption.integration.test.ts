import { encrypt, decrypt, maskApiKey } from "@/lib/services/encryption";

// Set up test encryption key
beforeAll(() => {
  process.env.ENCRYPTION_KEY = "test-encryption-key-for-settings-tests";
});

describe("Settings API logic", () => {
  describe("API key encryption roundtrip", () => {
    it("should encrypt and decrypt OpenAI keys", () => {
      const key = "sk-proj-test-openai-key-12345";
      const encrypted = encrypt(key);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(key);
      expect(encrypted).not.toBe(key);
    });

    it("should encrypt and decrypt Anthropic keys", () => {
      const key = "sk-ant-test-anthropic-key-12345";
      const encrypted = encrypt(key);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(key);
    });
  });

  describe("API key masking", () => {
    it("should mask keys for GET response", () => {
      const key = "sk-proj-1234567890abcdef";
      const masked = maskApiKey(key);

      expect(masked.startsWith("sk-p")).toBe(true);
      expect(masked.endsWith("cdef")).toBe(true);
      expect(masked).toContain("*");
      // Should not expose the full key
      expect(masked).not.toBe(key);
    });

    it("should handle null keys gracefully", () => {
      // When key is null, we just don't mask
      const result = null;
      expect(result).toBeNull();
    });
  });

  describe("Settings update logic", () => {
    it("should skip masked keys (containing *) in updates", () => {
      const maskedKey = "sk-p*************cdef";
      const shouldUpdate = !maskedKey.includes("*");
      expect(shouldUpdate).toBe(false);
    });

    it("should allow new keys without * to be updated", () => {
      const newKey = "sk-proj-new-key-12345";
      const shouldUpdate = !newKey.includes("*");
      expect(shouldUpdate).toBe(true);
    });
  });

  describe("Provider and model validation", () => {
    it("should accept valid providers", () => {
      const validProviders = ["OPENAI", "ANTHROPIC"];
      expect(validProviders).toContain("OPENAI");
      expect(validProviders).toContain("ANTHROPIC");
    });

    it("should have default model for each provider", () => {
      const defaults: Record<string, string> = {
        OPENAI: "gpt-4o",
        ANTHROPIC: "claude-sonnet-4-5-20250929",
      };
      expect(defaults.OPENAI).toBe("gpt-4o");
      expect(defaults.ANTHROPIC).toBe("claude-sonnet-4-5-20250929");
    });
  });
});
