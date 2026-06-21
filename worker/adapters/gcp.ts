import type { Category } from "../../lib/types";
import type { NormalizedProduct, PricingAdapter } from "../types";
import { dimensionFromText, envList, fetchJson, stableId } from "../utils";

type GcpService = { name: string; serviceId: string; displayName: string };
type GcpSku = {
  skuId: string;
  description: string;
  serviceRegions: string[];
  category: { resourceFamily: string; resourceGroup: string; usageType: string };
  pricingInfo: Array<{
    effectiveTime: string;
    pricingExpression: {
      usageUnit: string;
      tieredRates: Array<{ startUsageAmount: number; unitPrice: { units?: string; nanos?: number; currencyCode: string } }>;
    };
  }>;
};

function category(service: string, sku: GcpSku): Category {
  const text = `${service} ${sku.description} ${sku.category.resourceFamily} ${sku.category.resourceGroup}`.toLowerCase();
  if (/network|egress|internet/.test(text)) return "egress";
  if (/cloud sql/.test(text) && /postgres/.test(text)) return "database";
  if (/persistent disk/.test(text)) return "block_storage";
  if (/cloud storage/.test(text)) return "object_storage";
  if (/compute engine/.test(text) && /core|ram|instance/.test(text)) return "compute";
  return "other";
}

function money(units = "0", nanos = 0): string {
  return (Number(units) + nanos / 1_000_000_000).toString();
}

export const gcpAdapter: PricingAdapter = {
  provider: "gcp",
  async fetchProducts() {
    const apiKey = process.env.GCP_API_KEY;
    if (!apiKey) throw new Error("GCP_API_KEY is required for the GCP catalog");
    const regions = new Set(envList("GCP_REGIONS", ["us-central1"]));
    const services: GcpService[] = [];
    let token = "";
    do {
      const page: { services?: GcpService[]; nextPageToken?: string } = await fetchJson(
        `https://cloudbilling.googleapis.com/v1/services?key=${encodeURIComponent(apiKey)}&pageSize=5000${token ? `&pageToken=${encodeURIComponent(token)}` : ""}`,
      );
      services.push(...(page.services ?? []));
      token = page.nextPageToken ?? "";
    } while (token);

    const relevant = services;
    const output: NormalizedProduct[] = [];
    for (const service of relevant) {
      token = "";
      do {
        const page: { skus?: GcpSku[]; nextPageToken?: string } = await fetchJson(
          `https://cloudbilling.googleapis.com/v1/${service.name}/skus?key=${encodeURIComponent(apiKey)}&currencyCode=USD&pageSize=5000${token ? `&pageToken=${encodeURIComponent(token)}` : ""}`,
        );
        for (const sku of page.skus ?? []) {
          const region = sku.serviceRegions.find((item) => regions.has(item));
          const serviceCategory = category(service.displayName, sku);
          const pricing = sku.pricingInfo.at(-1);
          if (!region || !pricing) continue;
          const tiers = pricing.pricingExpression.tieredRates.map((tier) => ({
            startAmount: String(tier.startUsageAmount ?? 0),
            unitPrice: money(tier.unitPrice.units, tier.unitPrice.nanos),
          }));
          if (!tiers.length) continue;
          output.push({
            id: stableId("gcp", region, sku.skuId), provider: "gcp", region, regionName: region,
            category: serviceCategory, serviceCode: service.serviceId, serviceName: service.displayName,
            sku: sku.skuId, name: sku.description,
            attributes: { service: service.displayName, ...sku.category },
            meters: [{
              id: stableId("gcp", region, sku.skuId, pricing.pricingExpression.usageUnit),
              name: sku.description, unit: pricing.pricingExpression.usageUnit,
              dimension: dimensionFromText(`${sku.description} ${pricing.pricingExpression.usageUnit}`),
              effectiveAt: pricing.effectiveTime, tiers,
            }],
          });
        }
        token = page.nextPageToken ?? "";
      } while (token);
    }
    return output;
  },
};
