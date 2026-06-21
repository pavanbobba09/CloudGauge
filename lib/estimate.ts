import Decimal from "decimal.js";
import type {
  CatalogOption,
  EstimateRequest,
  EstimateResponse,
  PriceTier,
  RuntimeSchedule,
} from "@/lib/types";
import { billingUnitScale, inputUnitLabel, toBillingUnits } from "@/lib/units";

const MONTH_HOURS = new Decimal(730);
const DAYS_PER_MONTH = new Decimal(365).div(12);

export function monthlyRuntimeHours(schedule: RuntimeSchedule): Decimal {
  if (schedule.kind === "one_time") return new Decimal(schedule.totalHours);
  if (schedule.hoursPerDay === 24 && schedule.daysPerWeek === 7) return MONTH_HOURS;
  return Decimal.min(
    MONTH_HOURS,
    new Decimal(schedule.hoursPerDay).mul(schedule.daysPerWeek).mul(52).div(12),
  );
}

export function applyTieredPricing(amount: Decimal.Value, tiers: PriceTier[]): Decimal {
  const usage = new Decimal(amount);
  if (usage.isNegative()) throw new Error("Usage cannot be negative");
  const sorted = [...tiers].sort((a, b) => new Decimal(a.startAmount).cmp(b.startAmount));
  if (!sorted.length) throw new Error("Meter has no price tiers");

  return sorted.reduce((total, tier, index) => {
    const start = new Decimal(tier.startAmount);
    if (usage.lte(start)) return total;
    const next = sorted[index + 1] ? new Decimal(sorted[index + 1].startAmount) : usage;
    const billable = Decimal.min(usage, next).minus(start);
    return billable.isPositive() ? total.plus(billable.mul(tier.unitPrice)) : total;
  }, new Decimal(0));
}

function money(value: Decimal): string {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

function isHourly(option: CatalogOption): boolean {
  return /hrs?|hours?/i.test(option.unit) || option.dimension === "runtime";
}

export function calculateEstimate(
  request: EstimateRequest,
  catalog: CatalogOption[],
  metadata: { source: "database" | "fallback" | "mixed"; effectiveAt: string; now?: Date },
): EstimateResponse {
  const byMeter = new Map(catalog.map((item) => [item.meterId, item]));
  const providerTotals = { aws: new Decimal(0), azure: new Decimal(0), gcp: new Decimal(0) };
  const warnings: string[] = [];
  const assumptions = [
    "USD public on-demand list prices only.",
    "Recurring schedules use 52 weeks / 12 months and are capped at 730 hours per month.",
    "Taxes, credits, free tiers, commitments, and negotiated discounts are excluded.",
  ];

  const lines = request.lines.map((line) => {
    const option = byMeter.get(line.meterId);
    if (!option) throw new Error(`Unknown meter: ${line.meterId}`);
    if (line.confirmed === false) throw new Error(`Line ${line.id} must be confirmed before calculation`);

    const quantity = new Decimal(line.quantity);
    let billedUsage: Decimal;
    let hourlyCost: Decimal;
    let dailyCost: Decimal;
    let monthlyCost: Decimal;
    let formula: string;

    if (isHourly(option)) {
      if (!line.schedule) throw new Error(`A runtime schedule is required for ${option.productName}`);
      const hours = monthlyRuntimeHours(line.schedule);
      billedUsage = hours.mul(quantity);
      monthlyCost = applyTieredPricing(billedUsage, option.tiers);
      hourlyCost = applyTieredPricing(quantity, option.tiers);
      dailyCost = monthlyCost.div(DAYS_PER_MONTH);
      formula = `${quantity.toString()} × ${hours.toDecimalPlaces(2).toString()} hours × tiered rate`;
    } else {
      const rawUsage = new Decimal(line.usageAmount).mul(quantity);
      billedUsage = toBillingUnits(rawUsage, option.unit);
      monthlyCost = applyTieredPricing(billedUsage, option.tiers);
      hourlyCost = monthlyCost.div(MONTH_HOURS);
      dailyCost = monthlyCost.div(DAYS_PER_MONTH);
      const scale = billingUnitScale(option.unit);
      formula = `${quantity.toString()} × ${new Decimal(line.usageAmount).toString()} ${inputUnitLabel(option.unit)}${scale.eq(1) ? "" : ` ÷ ${scale.toString()}`} × tiered rate`;
    }
    providerTotals[option.provider] = providerTotals[option.provider].plus(monthlyCost);

    return {
      id: line.id,
      provider: option.provider,
      productName: option.productName,
      meterName: option.meterName,
      region: option.region,
      unit: option.unit,
      usageAmount: billedUsage.toDecimalPlaces(4).toString(),
      hourlyCost: money(hourlyCost),
      dailyCost: money(dailyCost),
      monthlyCost: money(monthlyCost),
      formula,
    };
  });

  const now = metadata.now ?? new Date();
  const ageMs = now.getTime() - new Date(metadata.effectiveAt).getTime();
  const stale = ageMs > 48 * 60 * 60 * 1000;
  if (metadata.source === "fallback") warnings.push("Using the bundled fallback catalog; run the catalog worker for current prices.");
  if (metadata.source === "mixed") warnings.push("One or more services use the bundled fallback catalog because that provider is not synchronized yet.");
  if (stale) warnings.push("Catalog prices are more than 48 hours old.");
  if (new Set(lines.map((line) => line.provider)).size > 1) {
    warnings.push("Provider configurations were selected independently and may not be technically equivalent.");
  }

  const grandTotal = Object.values(providerTotals).reduce((sum, value) => sum.plus(value), new Decimal(0));
  return {
    currency: "USD",
    catalog: { source: metadata.source, effectiveAt: metadata.effectiveAt, stale },
    lines,
    providerTotals: {
      aws: money(providerTotals.aws),
      azure: money(providerTotals.azure),
      gcp: money(providerTotals.gcp),
    },
    grandTotal: money(grandTotal),
    assumptions,
    warnings,
  };
}
