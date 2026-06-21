import { createHash } from "node:crypto";

export function stableId(...parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

export function envList(name: string, fallback: string[]): string[] {
  const value = process.env[name];
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : fallback;
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  return response.json() as Promise<T>;
}

export function dimensionFromText(text: string): string {
  const value = text.toLowerCase();
  if (/hour|hrs|instance|compute/.test(value)) return "runtime";
  if (/iops/.test(value)) return "iops";
  if (/throughput/.test(value)) return "throughput";
  if (/request|operation/.test(value)) return /write|put|class a/.test(value) ? "write_operations" : "operations";
  if (/transfer|egress|outbound/.test(value)) return "egress";
  return "storage";
}
