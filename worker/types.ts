import type { Category, Provider } from "../lib/types";

export type NormalizedMeter = {
  id: string;
  name: string;
  unit: string;
  dimension: string;
  effectiveAt: string;
  tiers: Array<{ startAmount: string; unitPrice: string }>;
};

export type NormalizedProduct = {
  id: string;
  provider: Provider;
  region: string;
  regionName: string;
  category: Category;
  serviceCode: string;
  serviceName: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  meters: NormalizedMeter[];
};

export type PricingAdapter = {
  provider: Provider;
  fetchProducts(): Promise<NormalizedProduct[]>;
};
