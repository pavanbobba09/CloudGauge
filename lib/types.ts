export const PROVIDERS = ["aws", "azure", "gcp"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const CATEGORIES = [
  "compute",
  "block_storage",
  "object_storage",
  "database",
  "egress",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type PriceTier = {
  startAmount: string;
  unitPrice: string;
};

export type CatalogOption = {
  id: string;
  provider: Provider;
  region: string;
  category: Category;
  serviceCode: string;
  serviceName: string;
  sku: string;
  productName: string;
  meterId: string;
  meterName: string;
  unit: string;
  dimension: string;
  effectiveAt: string;
  tiers: PriceTier[];
};

export type RuntimeSchedule =
  | { kind: "one_time"; totalHours: number }
  | { kind: "recurring"; hoursPerDay: number; daysPerWeek: number };

export type EstimateLineInput = {
  id: string;
  meterId: string;
  quantity: number;
  usageAmount: number;
  schedule?: RuntimeSchedule;
  confirmed?: boolean;
};

export type EstimateRequest = {
  currency: "USD";
  lines: EstimateLineInput[];
};

export type EstimateLineResult = {
  id: string;
  provider: Provider;
  productName: string;
  meterName: string;
  region: string;
  unit: string;
  usageAmount: string;
  hourlyCost: string;
  dailyCost: string;
  monthlyCost: string;
  formula: string;
};

export type EstimateResponse = {
  currency: "USD";
  catalog: { source: "database" | "fallback" | "mixed"; effectiveAt: string; stale: boolean };
  lines: EstimateLineResult[];
  providerTotals: Record<Provider, string>;
  grandTotal: string;
  assumptions: string[];
  warnings: string[];
};
