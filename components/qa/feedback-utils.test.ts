import { nextFeedback } from "./feedback-utils";

describe("nextFeedback", () => {
  it("selects GOOD when unrated", () => {
    expect(nextFeedback(null, "GOOD")).toBe("GOOD");
  });

  it("selects BAD when unrated", () => {
    expect(nextFeedback(null, "BAD")).toBe("BAD");
  });

  it("clears when clicking selected GOOD", () => {
    expect(nextFeedback("GOOD", "GOOD")).toBeNull();
  });

  it("clears when clicking selected BAD", () => {
    expect(nextFeedback("BAD", "BAD")).toBeNull();
  });

  it("switches GOOD to BAD", () => {
    expect(nextFeedback("GOOD", "BAD")).toBe("BAD");
  });

  it("switches BAD to GOOD", () => {
    expect(nextFeedback("BAD", "GOOD")).toBe("GOOD");
  });
});
