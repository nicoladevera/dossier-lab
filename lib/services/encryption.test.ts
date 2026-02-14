import { encrypt, decrypt, maskApiKey } from "./encryption";

// Set up test encryption key
beforeAll(() => {
  process.env.ENCRYPTION_KEY = "test-encryption-key-for-unit-tests";
});

describe("Encryption utility", () => {
  it("should encrypt and decrypt a string successfully", () => {
    const plaintext = "sk-test-api-key-12345";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it("should produce different ciphertext for the same plaintext", () => {
    const plaintext = "sk-test-api-key-12345";
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);

    expect(encrypted1).not.toBe(encrypted2);
  });

  it("should produce ciphertext in iv:tag:data format", () => {
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");

    expect(parts).toHaveLength(3);
    // IV is 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32);
    // Auth tag is 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // Ciphertext is present
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("should throw on invalid encrypted text format", () => {
    expect(() => decrypt("invalid")).toThrow("Invalid encrypted text format");
    expect(() => decrypt("a:b")).toThrow("Invalid encrypted text format");
  });

  it("should handle empty strings", () => {
    const encrypted = encrypt("");
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe("");
  });

  it("should handle special characters", () => {
    const plaintext = "sk-test!@#$%^&*()_+-=[]{}|;':\",./<>?";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});

describe("maskApiKey", () => {
  it("should mask the middle of a long key", () => {
    const key = "sk-1234567890abcdef";
    const masked = maskApiKey(key);
    expect(masked).toBe("sk-1***********cdef");
    expect(masked.startsWith("sk-1")).toBe(true);
    expect(masked.endsWith("cdef")).toBe(true);
  });

  it("should fully mask short keys", () => {
    const masked = maskApiKey("short");
    expect(masked).toBe("*****");
  });
});
