import Decimal from "decimal.js";

export function billingUnitScale(unit: string): Decimal {
  const normalized = unit.trim();
  const thousands = normalized.match(/^(\d+(?:\.\d+)?)\s*K(?:\s|$)/i);
  if (thousands) return new Decimal(thousands[1]).mul(1_000);
  const millions = normalized.match(/^(\d+(?:\.\d+)?)\s*M(?:\s|$)/i);
  if (millions) return new Decimal(millions[1]).mul(1_000_000);
  return new Decimal(1);
}

export function inputUnitLabel(unit: string): string {
  const scale = billingUnitScale(unit);
  if (scale.eq(1)) return unit;
  return unit.replace(/^\d+(?:\.\d+)?\s*[KM]\s*/i, "").trim() || "units";
}

export function toBillingUnits(inputAmount: Decimal.Value, unit: string): Decimal {
  return new Decimal(inputAmount).div(billingUnitScale(unit));
}
