import { describe, expect, it, vi } from "vitest";
import { activateCatalog, cleanupCatalogVersions, copyUnselectedProviders, failCatalog, insertProducts } from "@/worker/sync";

describe("catalog activation", () => {
  it("retires the old catalog and activates staging in one transaction", async () => {
    const query = vi.fn().mockResolvedValue({});
    await activateCatalog({ query } as never, "new-version");
    expect(query.mock.calls.map((call) => call[0])).toEqual([
      "BEGIN",
      "UPDATE catalog_versions SET status='retired' WHERE status='active'",
      "UPDATE catalog_versions SET status='active', activated_at=now() WHERE id=$1",
      "COMMIT",
    ]);
  });
  it("rolls back before marking a catalog failed", async () => {
    const query = vi.fn().mockResolvedValue({});
    await failCatalog({ query } as never, "bad-version");
    expect(query.mock.calls[0][0]).toBe("ROLLBACK");
    expect(query.mock.calls[1][0]).toContain("status='failed'");
  });

  it("bulk-inserts normalized catalog rows", async () => {
    const query = vi.fn().mockResolvedValue({});
    await insertProducts({ query } as never, "version", [{
      id: "product", provider: "aws", region: "global", regionName: "Global", category: "other",
      serviceCode: "AWSLambda", serviceName: "AWS Lambda", sku: "sku", name: "Lambda requests", attributes: {},
      meters: [{ id: "meter", name: "Requests", unit: "1M requests", dimension: "operations", effectiveAt: "2026-01-01", tiers: [{ startAmount: "0", unitPrice: "0.2" }] }],
    }]);
    expect(query).toHaveBeenCalledTimes(4);
    expect(query.mock.calls[0][0]).toContain("INSERT INTO regions");
    expect(query.mock.calls[3][0]).toContain("INSERT INTO price_tiers");
  });

  it("removes failed and old retired catalog versions", async () => {
    const query = vi.fn().mockResolvedValue({});
    await cleanupCatalogVersions({ query } as never);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toContain("status='failed'");
    expect(query.mock.calls[1][0]).toContain("LIMIT 1");
  });

  it("carries unselected providers into a partial catalog refresh", async () => {
    const query = vi.fn().mockResolvedValue({});
    await copyUnselectedProviders({ query } as never, "new-version", ["gcp"]);
    expect(query).toHaveBeenCalledTimes(4);
    for (const call of query.mock.calls) {
      expect(call[0]).toContain("NOT (");
      expect(call[1]).toEqual(["new-version", ["gcp"]]);
    }
  });
});
