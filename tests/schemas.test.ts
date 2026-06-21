import { describe, expect, it } from "vitest";
import { aiDraftSchema, estimateRequestSchema } from "@/lib/schemas";

describe("API validation", () => {
  it("rejects negative usage", () => {
    expect(estimateRequestSchema.safeParse({ currency: "USD", lines: [{ id: "x", meterId: "m", quantity: 1, usageAmount: -1 }] }).success).toBe(false);
  });
  it("rejects unsupported schedule limits", () => {
    expect(estimateRequestSchema.safeParse({ currency: "USD", lines: [{ id: "x", meterId: "m", quantity: 1, usageAmount: 0, schedule: { kind: "recurring", hoursPerDay: 25, daysPerWeek: 5 } }] }).success).toBe(false);
  });
  it("treats model output as untrusted", () => {
    const invented = { summary: "x", warnings: [], lines: [{ provider: "other", category: "compute", region: null, searchTerms: "x", quantity: 1, usageAmount: 0, schedule: null, unresolved: [] }] };
    expect(aiDraftSchema.safeParse(invented).success).toBe(false);
  });
});
