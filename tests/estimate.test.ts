import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { applyTieredPricing, calculateEstimate, monthlyRuntimeHours } from "@/lib/estimate";
import { FALLBACK_CATALOG } from "@/lib/fallback-catalog";
import { billingUnitScale, inputUnitLabel, toBillingUnits } from "@/lib/units";

describe("schedule calculations", () => {
  it("uses 52 weeks / 12 for recurring schedules", () => {
    expect(monthlyRuntimeHours({ kind: "recurring", hoursPerDay: 8, daysPerWeek: 5 }).toFixed(4)).toBe("173.3333");
  });
  it("caps recurring runtime at 730 hours", () => {
    expect(monthlyRuntimeHours({ kind: "recurring", hoursPerDay: 24, daysPerWeek: 7 }).toNumber()).toBe(730);
  });
  it("preserves a one-time duration", () => {
    expect(monthlyRuntimeHours({ kind: "one_time", totalHours: 41.5 }).toNumber()).toBe(41.5);
  });
});

describe("tiered rates", () => {
  it("charges each tier only inside its boundary", () => {
    const cost = applyTieredPricing(new Decimal(250), [
      { startAmount: "0", unitPrice: "0.10" },
      { startAmount: "100", unitPrice: "0.08" },
      { startAmount: "200", unitPrice: "0.05" },
    ]);
    expect(cost.toFixed(2)).toBe("20.50");
  });
  it("uses decimal arithmetic for currency", () => {
    expect(applyTieredPricing("3", [{ startAmount: "0", unitPrice: "0.1" }]).toString()).toBe("0.3");
  });
});

describe("provider unit normalization", () => {
  it("converts raw operations into provider billing units", () => {
    expect(billingUnitScale("10K operations").toNumber()).toBe(10_000);
    expect(toBillingUnits(25_000, "10K operations").toNumber()).toBe(2.5);
    expect(inputUnitLabel("10K operations")).toBe("operations");
  });

  it("leaves ordinary capacity units unchanged", () => {
    expect(toBillingUnits(250, "GB-Mo").toNumber()).toBe(250);
  });
});

describe("estimate", () => {
  it("calculates compute and storage and emits cross-cloud warnings", () => {
    const aws = FALLBACK_CATALOG.find((item) => item.sku === "t3.medium")!;
    const gcp = FALLBACK_CATALOG.find((item) => item.sku === "pd-balanced")!;
    const result = calculateEstimate(
      { currency: "USD", lines: [
        { id: "compute", meterId: aws.meterId, quantity: 2, usageAmount: 0, schedule: { kind: "recurring", hoursPerDay: 8, daysPerWeek: 5 }, confirmed: true },
        { id: "storage", meterId: gcp.meterId, quantity: 1, usageAmount: 200, confirmed: true },
      ] },
      [aws, gcp],
      { source: "fallback", effectiveAt: "2025-01-01T00:00:00.000Z", now: new Date("2025-01-05") },
    );
    expect(result.lines[0].monthlyCost).toBe("14.42");
    expect(result.lines[1].monthlyCost).toBe("20.00");
    expect(result.grandTotal).toBe("34.42");
    expect(result.warnings).toContain("Provider configurations were selected independently and may not be technically equivalent.");
  });
  it("rejects an unconfirmed AI draft", () => {
    const meter = FALLBACK_CATALOG[0];
    expect(() => calculateEstimate(
      { currency: "USD", lines: [{ id: "draft", meterId: meter.meterId, quantity: 1, usageAmount: 0, schedule: { kind: "one_time", totalHours: 2 }, confirmed: false }] },
      [meter], { source: "fallback", effectiveAt: meter.effectiveAt },
    )).toThrow("must be confirmed");
  });
});
