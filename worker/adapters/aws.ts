import type { Category } from "../../lib/types";
import type { NormalizedProduct, PricingAdapter } from "../types";
import { dimensionFromText, envList, fetchJson, stableId } from "../utils";

type AwsOffer = {
  publicationDate: string;
  products: Record<string, {
    sku: string;
    productFamily?: string;
    attributes: Record<string, string>;
  }>;
  terms: {
    OnDemand?: Record<string, Record<string, {
      effectiveDate: string;
      priceDimensions: Record<string, {
        description: string;
        unit: string;
        beginRange: string;
        pricePerUnit: { USD?: string };
      }>;
    }>>;
  };
};

type AwsServiceIndex = { offers: Record<string, { offerCode: string; currentRegionIndexUrl?: string }> };
type AwsRegionIndex = { regions: Record<string, { currentVersionUrl: string }> };

const DEFAULT_SERVICES = [
  "AmazonEC2", "AmazonRDS", "AmazonS3", "AWSDataTransfer", "AWSLambda", "AmazonDynamoDB",
  "AmazonECS", "AmazonEKS", "AmazonCloudWatch", "AmazonApiGateway", "AmazonElastiCache", "AmazonCloudFront",
];

const CORE_CATEGORIES: Record<string, Category> = {
  AmazonEC2: "compute",
  AmazonRDS: "database",
  AmazonS3: "object_storage",
  AWSDataTransfer: "egress",
};

function categoryFor(service: string, family: string | undefined): Category | null {
  if (service === "AmazonEC2") {
    if (family === "Compute Instance") return "compute";
    if (/storage/i.test(family ?? "")) return "block_storage";
    return null;
  }
  return CORE_CATEGORIES[service] ?? "other";
}

function estimatorAttributes(attributes: Record<string, string>): Record<string, string> {
  const keep = [
    "instanceType", "vcpu", "memory", "operatingSystem", "tenancy", "preInstalledSw",
    "databaseEngine", "deploymentOption", "volumeType", "storageMedia", "groupDescription",
  ];
  return Object.fromEntries(keep.flatMap((key) => attributes[key] ? [[key, attributes[key]]] : []));
}

export const awsAdapter: PricingAdapter = {
  provider: "aws",
  async fetchProducts() {
    const products: NormalizedProduct[] = [];
    const baseUrl = "https://pricing.us-east-1.amazonaws.com";
    const index = await fetchJson<AwsServiceIndex>(`${baseUrl}/offers/v1.0/aws/index.json`);
    const configured = envList("AWS_SERVICE_CODES", DEFAULT_SERVICES);
    const serviceCodes = process.env.AWS_ALL_SERVICES === "true" ? Object.keys(index.offers) : configured;
    for (const region of envList("AWS_REGIONS", ["us-east-1"])) {
      for (const serviceCode of serviceCodes) {
        const metadata = index.offers[serviceCode];
        if (!metadata?.currentRegionIndexUrl) continue;
        const regionIndex = await fetchJson<AwsRegionIndex>(new URL(metadata.currentRegionIndexUrl, baseUrl).toString());
        const versionPath = regionIndex.regions[region]?.currentVersionUrl;
        if (!versionPath) continue;
        const offer = await fetchJson<AwsOffer>(new URL(versionPath, baseUrl).toString());
        for (const raw of Object.values(offer.products)) {
          const category = categoryFor(serviceCode, raw.productFamily);
          if (!category) continue;
          const termGroups = offer.terms.OnDemand?.[raw.sku];
          if (!termGroups) continue;
          const meters = Object.entries(termGroups).flatMap(([termId, term]) => {
            const grouped = new Map<string, {
              id: string; name: string; unit: string; dimension: string; effectiveAt: string;
              tiers: Array<{ startAmount: string; unitPrice: string }>;
            }>();
            for (const price of Object.values(term.priceDimensions)) {
              if (price.pricePerUnit.USD === undefined || price.pricePerUnit.USD === "0.0000000000") continue;
              const dimension = dimensionFromText(`${price.description} ${price.unit}`);
              const key = `${price.unit}:${dimension}`;
              const meter = grouped.get(key) ?? {
                id: stableId("aws", region, raw.sku, termId, key),
                name: price.description,
                unit: price.unit,
                dimension,
                effectiveAt: term.effectiveDate ?? offer.publicationDate,
                tiers: [],
              };
              meter.tiers.push({ startAmount: price.beginRange || "0", unitPrice: price.pricePerUnit.USD });
              meter.tiers.sort((a, b) => Number(a.startAmount) - Number(b.startAmount));
              grouped.set(key, meter);
            }
            return [...grouped.values()];
          });
          if (!meters.length) continue;
          const name = raw.attributes.instanceType ?? raw.attributes.usagetype ?? raw.attributes.groupDescription ?? raw.sku;
          products.push({
            id: stableId("aws", region, raw.sku), provider: "aws", region, regionName: raw.attributes.location ?? region,
            category, serviceCode, serviceName: serviceCode.replace("Amazon", "Amazon "),
            sku: raw.sku, name: `${serviceCode.replace("Amazon", "")} ${name}`,
            // AWS offer records contain many duplicated metadata fields. Keep
            // only estimator-relevant attributes so catalog versions fit the
            // database without changing SKU or pricing precision.
            attributes: estimatorAttributes(raw.attributes), meters,
          });
        }
      }
    }
    return products;
  },
};
