import { calculateCost, getPricing } from "./cost-tracker";

describe("Cost Tracker", () => {
  it("calculates cost for gpt-5-mini", () => {
    const cost = calculateCost("gpt-5-mini", 1000, 500);
    // 1000 * 0.25/1M + 500 * 2.0/1M = 0.00025 + 0.001 = 0.00125
    expect(cost).toBeCloseTo(0.00125, 6);
  });

  it("calculates cost for gpt-4.1-nano", () => {
    const cost = calculateCost("gpt-4.1-nano", 1000, 500);
    // 1000 * 0.1/1M + 500 * 0.4/1M = 0.0001 + 0.0002 = 0.0003
    expect(cost).toBeCloseTo(0.0003, 6);
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
    // Falls back to gpt-5-mini pricing
    expect(cost).toBeCloseTo(0.00125, 6);
  });

  it("returns zero for zero tokens", () => {
    const cost = calculateCost("gpt-5-mini", 0, 0);
    expect(cost).toBe(0);
  });

  it("returns pricing info", () => {
    const pricing = getPricing("gpt-5-mini");
    expect(pricing).not.toBeNull();
    expect(pricing!.promptPricePerToken).toBeGreaterThan(0);
    expect(pricing!.completionPricePerToken).toBeGreaterThan(0);
  });

  it("returns null for unknown model pricing", () => {
    const pricing = getPricing("unknown-model");
    expect(pricing).toBeNull();
  });
});
