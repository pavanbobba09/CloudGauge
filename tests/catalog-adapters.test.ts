import { afterEach, describe, expect, it, vi } from "vitest";
import { awsAdapter } from "@/worker/adapters/aws";
import { azureAdapter } from "@/worker/adapters/azure";
import { gcpAdapter } from "@/worker/adapters/gcp";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.GCP_API_KEY;
  delete process.env.AWS_REGIONS;
  delete process.env.AWS_SERVICE_CODES;
  delete process.env.AWS_ALL_SERVICES;
  delete process.env.AZURE_REGIONS;
  delete process.env.GCP_REGIONS;
  vi.restoreAllMocks();
});

describe("pricing adapter contracts", () => {
  it("normalizes AWS offer terms and ignores unsupported products", async () => {
    process.env.AWS_REGIONS = "us-east-1";
    process.env.AWS_SERVICE_CODES = "AmazonEC2";
    global.fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.endsWith("/offers/v1.0/aws/index.json")) return new Response(JSON.stringify({
        offers: { AmazonEC2: { offerCode: "AmazonEC2", currentRegionIndexUrl: "/ec2-regions.json" } },
      }), { status: 200 });
      if (url.endsWith("/ec2-regions.json")) return new Response(JSON.stringify({
        regions: { "us-east-1": { currentVersionUrl: "/AmazonEC2.json" } },
      }), { status: 200 });
      return new Response(JSON.stringify({
        publicationDate: "2026-01-01T00:00:00Z",
        products: { sku1: { sku: "sku1", productFamily: "Compute Instance", attributes: { instanceType: "t3.nano", location: "US East" } } },
        terms: { OnDemand: { sku1: { offer: { effectiveDate: "2026-01-01T00:00:00Z", priceDimensions: {
          d1: { description: "Linux instance hour", unit: "Hrs", beginRange: "0", pricePerUnit: { USD: "0.005" } },
          d2: { description: "Linux instance hour", unit: "Hrs", beginRange: "100", pricePerUnit: { USD: "0.004" } },
        } } } } },
      }), { status: 200 });
    }) as typeof fetch;
    const products = await awsAdapter.fetchProducts();
    expect(products).toHaveLength(1);
    expect(products[0].meters[0]).toMatchObject({ unit: "Hrs", dimension: "runtime" });
    expect(products[0].meters[0].tiers).toHaveLength(2);
  });

  it("follows Azure pagination and filters configured regions", async () => {
    process.env.AZURE_REGIONS = "eastus";
    let page = 0;
    global.fetch = vi.fn(async () => {
      page += 1;
      return new Response(JSON.stringify(page === 1 ? {
        Items: [
          { currencyCode: "USD", retailPrice: 0.04, unitOfMeasure: "1 Hour", armRegionName: "eastus", productId: "p", skuId: "s", productName: "Virtual Machines", skuName: "B2s", meterId: "m", meterName: "B2s", serviceName: "Virtual Machines", serviceFamily: "Compute", type: "Consumption", effectiveStartDate: "2026-01-01", tierMinimumUnits: 0 },
          { currencyCode: "USD", retailPrice: 0.03, unitOfMeasure: "1 Hour", armRegionName: "eastus", productId: "p", skuId: "s", productName: "Virtual Machines", skuName: "B2s", meterId: "m", meterName: "B2s", serviceName: "Virtual Machines", serviceFamily: "Compute", type: "Consumption", effectiveStartDate: "2026-01-01", tierMinimumUnits: 100 },
          { currencyCode: "USD", retailPrice: 0.05, unitOfMeasure: "1 Hour", armRegionName: "eastus", productId: "p2", skuId: "s2", productName: "Virtual Machines", skuName: "B4s", meterId: "m", meterName: "B4s", serviceName: "Virtual Machines", serviceFamily: "Compute", type: "Consumption", effectiveStartDate: "2026-01-01", tierMinimumUnits: 0 },
        ],
        NextPageLink: "https://next",
      } : { Items: [] }), { status: 200 });
    }) as typeof fetch;
    const products = await azureAdapter.fetchProducts();
    expect(page).toBe(2);
    expect(products[0]).toMatchObject({ provider: "azure", category: "compute" });
    expect(products).toHaveLength(2);
    expect(products[0].meters).toHaveLength(1);
    expect(products[0].meters[0].tiers).toHaveLength(2);
    expect(products[0].meters[0].id).not.toBe(products[1].meters[0].id);
  });

  it("normalizes GCP tiered SKU prices", async () => {
    process.env.GCP_API_KEY = "test";
    process.env.GCP_REGIONS = "us-central1";
    global.fetch = vi.fn(async (input) => {
      if (String(input).includes("/v1/services?")) {
        return new Response(JSON.stringify({ services: [{ name: "services/compute", serviceId: "compute", displayName: "Compute Engine" }] }), { status: 200 });
      }
      return new Response(JSON.stringify({ skus: [{
        skuId: "sku", description: "Compute Engine instance core", serviceRegions: ["us-central1"],
        category: { resourceFamily: "Compute", resourceGroup: "CPU", usageType: "OnDemand" },
        pricingInfo: [{ effectiveTime: "2026-01-01T00:00:00Z", pricingExpression: { usageUnit: "h", tieredRates: [{ startUsageAmount: 0, unitPrice: { units: "0", nanos: 10000000, currencyCode: "USD" } }] } }],
      }] }), { status: 200 });
    }) as typeof fetch;
    const products = await gcpAdapter.fetchProducts();
    expect(products[0].meters[0].tiers[0].unitPrice).toBe("0.01");
  });
});
