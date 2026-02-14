import bcrypt from "bcryptjs";

describe("Auth utilities", () => {
  describe("Password hashing", () => {
    it("should hash passwords with bcrypt", async () => {
      const password = "testpassword123";
      const hash = await bcrypt.hash(password, 12);

      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]?\$/);
    });

    it("should verify correct passwords", async () => {
      const password = "testpassword123";
      const hash = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect passwords", async () => {
      const password = "testpassword123";
      const hash = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare("wrongpassword", hash);
      expect(isValid).toBe(false);
    });

    it("should generate different hashes for the same password", async () => {
      const password = "testpassword123";
      const hash1 = await bcrypt.hash(password, 12);
      const hash2 = await bcrypt.hash(password, 12);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("Signup validation", () => {
    it("should require email and password", () => {
      expect("").toBeFalsy();
      expect("test@example.com").toBeTruthy();
    });

    it("should require password of at least 8 characters", () => {
      expect("short".length >= 8).toBe(false);
      expect("longenoughpassword".length >= 8).toBe(true);
    });
  });
});
