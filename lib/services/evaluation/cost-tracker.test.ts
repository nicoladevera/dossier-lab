import { calculateCost, getPricing } from "./cost-tracker";

describe("Cost Tracker", () => {
  it("calculates cost for gpt-4o", () => {
    const cost = calculateCost("gpt-4o", 1000, 500);
    // 1000 * 2.5/1M + 500 * 10/1M = 0.0025 + 0.005 = 0.0075
    expect(cost).toBeCloseTo(0.0075, 6);
  });

  it("calculates cost for gpt-4o-mini", () => {
    const cost = calculateCost("gpt-4o-mini", 1000, 500);
    // 1000 * 0.15/1M + 500 * 0.6/1M = 0.00015 + 0.0003 = 0.00045
    expect(cost).toBeCloseTo(0.00045, 6);
  });

  it("calculates cost for claude-sonnet-4-5-20250929", () => {
    const cost = calculateCost("claude-sonnet-4-5-20250929", 1000, 500);
    // 1000 * 3/1M + 500 * 15/1M = 0.003 + 0.0075 = 0.0105
    expect(cost).toBeCloseTo(0.0105, 6);
  });

  it("calculates cost for embedding model", () => {
    const cost = calculateCost("text-embedding-3-small", 5000, 0);
    // 5000 * 0.02/1M = 0.0001
    expect(cost).toBeCloseTo(0.0001, 6);
  });

  it("uses fallback pricing for unknown models", () => {
    const cost = calculateCost("unknown-model", 1000, 500);
    // Falls back to gpt-4o pricing
    expect(cost).toBeCloseTo(0.0075, 6);
  });

  it("returns zero for zero tokens", () => {
    const cost = calculateCost("gpt-4o", 0, 0);
    expect(cost).toBe(0);
  });

  it("returns pricing info", () => {
    const pricing = getPricing("gpt-4o");
    expect(pricing).not.toBeNull();
    expect(pricing!.promptPricePerToken).toBeGreaterThan(0);
    expect(pricing!.completionPricePerToken).toBeGreaterThan(0);
  });

  it("returns null for unknown model pricing", () => {
    const pricing = getPricing("unknown-model");
    expect(pricing).toBeNull();
  });
});
