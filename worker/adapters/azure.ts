import type { Category } from "../../lib/types";
import type { NormalizedProduct, PricingAdapter } from "../types";
import { dimensionFromText, envList, fetchJson, stableId } from "../utils";

type AzureItem = {
  currencyCode: string;
  retailPrice: number;
  unitOfMeasure: string;
  armRegionName: string;
  productId: string;
  skuId: string;
  productName: string;
  skuName: string;
  meterId: string;
  meterName: string;
  serviceName: string;
  serviceFamily: string;
  type: string;
  effectiveStartDate: string;
  tierMinimumUnits: number;
};
type AzurePage = { Items: AzureItem[]; NextPageLink?: string };

function category(item: AzureItem): Category {
  const text = `${item.serviceName} ${item.serviceFamily} ${item.productName} ${item.meterName}`.toLowerCase();
  if (/bandwidth|data transfer|egress/.test(text)) return "egress";
  if (/postgresql/.test(text)) return "database";
  if (/virtual machines/.test(text) && !/disk|storage/.test(text)) return "compute";
  if (/managed disk|disk storage/.test(text)) return "block_storage";
  if (/storage/.test(text)) return "object_storage";
  return "other";
}

export const azureAdapter: PricingAdapter = {
  provider: "azure",
  async fetchProducts() {
    const regions = envList("AZURE_REGIONS", ["eastus"]);
    const output = new Map<string, NormalizedProduct>();
    for (const region of regions) {
      const filter = encodeURIComponent(`priceType eq 'Consumption' and armRegionName eq '${region}'`);
      let url: string | undefined = `https://prices.azure.com/api/retail/prices?currencyCode='USD'&$filter=${filter}`;
      while (url) {
        const page: AzurePage = await fetchJson<AzurePage>(url);
        for (const item of page.Items) {
          if (item.currencyCode !== "USD") continue;
        const serviceCategory = category(item);
        if (!Number.isFinite(item.retailPrice) || item.retailPrice < 0) continue;
        const productId = stableId("azure", item.armRegionName, item.productId, item.skuId);
        const existing = output.get(productId) ?? {
          id: productId, provider: "azure" as const, region: item.armRegionName, regionName: item.armRegionName,
          category: serviceCategory, serviceCode: item.serviceName, serviceName: item.serviceName,
          sku: item.skuId, name: `${item.productName} ${item.skuName}`.trim(),
          attributes: { serviceName: item.serviceName, serviceFamily: item.serviceFamily }, meters: [],
        };
        const meterId = stableId("azure", item.armRegionName, productId, item.meterId);
        const meter = existing.meters.find((candidate) => candidate.id === meterId);
        const tier = { startAmount: String(item.tierMinimumUnits ?? 0), unitPrice: String(item.retailPrice) };
        if (meter) {
          if (!meter.tiers.some((candidate) => candidate.startAmount === tier.startAmount)) meter.tiers.push(tier);
          meter.tiers.sort((a, b) => Number(a.startAmount) - Number(b.startAmount));
        } else {
          existing.meters.push({
            id: meterId, name: item.meterName,
            unit: item.unitOfMeasure, dimension: dimensionFromText(`${item.meterName} ${item.unitOfMeasure}`),
            effectiveAt: item.effectiveStartDate,
            tiers: [tier],
          });
        }
          output.set(productId, existing);
        }
        url = page.NextPageLink;
      }
    }
    return [...output.values()].filter((product) => product.meters.length > 0);
  },
};
