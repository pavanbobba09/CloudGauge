import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import type { PoolClient } from "pg";
import { closePool, getPool } from "../lib/db";
import { awsAdapter } from "./adapters/aws";
import { azureAdapter } from "./adapters/azure";
import { gcpAdapter } from "./adapters/gcp";
import type { NormalizedProduct, PricingAdapter } from "./types";
import { envList } from "./utils";

const adapters: PricingAdapter[] = [awsAdapter, azureAdapter, gcpAdapter];

async function insertRows(
  client: Pick<PoolClient, "query">,
  table: string,
  columns: string[],
  rows: unknown[][],
  suffix = "",
) {
  const chunkSize = 250;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const values = chunk.flat();
    const placeholders = chunk.map((_, rowIndex) =>
      `(${columns.map((__, columnIndex) => `$${rowIndex * columns.length + columnIndex + 1}`).join(",")})`,
    ).join(",");
    await client.query(`INSERT INTO ${table} (${columns.join(",")}) VALUES ${placeholders} ${suffix}`, values);
  }
}

export async function insertProducts(client: Pick<PoolClient, "query">, versionId: string, products: NormalizedProduct[]) {
  const regions = [...new Map(products.map((product) => [`${product.provider}:${product.region}`, [
    product.region, versionId, product.provider, product.regionName,
  ]])).values()];
  const productRows = products.map((product) => [
    product.id, versionId, product.provider, product.region, product.category, product.serviceCode,
    product.serviceName, product.sku, product.name, JSON.stringify(product.attributes),
  ]);
  const meterRows = products.flatMap((product) => product.meters.map((meter) => [
    meter.id, versionId, product.id, meter.name, meter.unit, meter.dimension, meter.effectiveAt,
  ]));
  const tierRows = products.flatMap((product) => product.meters.flatMap((meter) => meter.tiers.map((tier) => [
    versionId, meter.id, tier.startAmount, tier.unitPrice,
  ])));

  await insertRows(client, "regions", ["id", "version_id", "provider", "name"], regions, "ON CONFLICT DO NOTHING");
  await insertRows(client, "products", ["id", "version_id", "provider", "region_id", "category", "service_code", "service_name", "sku", "name", "attributes"], productRows);
  await insertRows(client, "meters", ["id", "version_id", "product_id", "name", "unit", "dimension", "effective_at"], meterRows);
  await insertRows(client, "price_tiers", ["version_id", "meter_id", "start_amount", "unit_price"], tierRows, "ON CONFLICT DO NOTHING");
}

export async function activateCatalog(client: Pick<PoolClient, "query">, versionId: string) {
  await client.query("BEGIN");
  await client.query("UPDATE catalog_versions SET status='retired' WHERE status='active'");
  await client.query("UPDATE catalog_versions SET status='active', activated_at=now() WHERE id=$1", [versionId]);
  await client.query("COMMIT");
}

export async function failCatalog(client: Pick<PoolClient, "query">, versionId: string) {
  await client.query("ROLLBACK").catch(() => undefined);
  await client.query("UPDATE catalog_versions SET status='failed' WHERE id=$1", [versionId]);
}

export async function cleanupCatalogVersions(client: Pick<PoolClient, "query">) {
  await client.query("DELETE FROM catalog_versions WHERE status='failed'");
  await client.query(`
    DELETE FROM catalog_versions
    WHERE status='retired' AND id NOT IN (
      SELECT id FROM catalog_versions WHERE status='retired' ORDER BY activated_at DESC NULLS LAST LIMIT 1
    )
  `);
}

export async function copyUnselectedProviders(
  client: Pick<PoolClient, "query">,
  versionId: string,
  selectedProviders: string[],
) {
  const params = [versionId, selectedProviders];
  const active = "SELECT id FROM catalog_versions WHERE status='active' ORDER BY activated_at DESC NULLS LAST LIMIT 1";
  await client.query(`
    INSERT INTO regions (id, version_id, provider, name)
    SELECT r.id, $1, r.provider, r.name
    FROM regions r
    WHERE r.version_id=(${active}) AND NOT (r.provider=ANY($2::text[]))
  `, params);
  await client.query(`
    INSERT INTO products (id, version_id, provider, region_id, category, service_code, service_name, sku, name, attributes)
    SELECT p.id, $1, p.provider, p.region_id, p.category, p.service_code, p.service_name, p.sku, p.name, p.attributes
    FROM products p
    WHERE p.version_id=(${active}) AND NOT (p.provider=ANY($2::text[]))
  `, params);
  await client.query(`
    INSERT INTO meters (id, version_id, product_id, name, unit, dimension, currency, effective_at)
    SELECT m.id, $1, m.product_id, m.name, m.unit, m.dimension, m.currency, m.effective_at
    FROM meters m
    JOIN products p ON p.version_id=m.version_id AND p.id=m.product_id
    WHERE m.version_id=(${active}) AND NOT (p.provider=ANY($2::text[]))
  `, params);
  await client.query(`
    INSERT INTO price_tiers (version_id, meter_id, start_amount, unit_price)
    SELECT $1, t.meter_id, t.start_amount, t.unit_price
    FROM price_tiers t
    JOIN meters m ON m.version_id=t.version_id AND m.id=t.meter_id
    JOIN products p ON p.version_id=m.version_id AND p.id=m.product_id
    WHERE t.version_id=(${active}) AND NOT (p.provider=ANY($2::text[]))
  `, params);
}

export async function main() {
  const pool = getPool();
  if (!pool) throw new Error("DATABASE_URL is required");
  const versionId = randomUUID();
  let activated = false;
  try {
    await pool.query("INSERT INTO catalog_versions (id, status) VALUES ($1, 'staging')", [versionId]);

    const selectedProviders = new Set(envList("CATALOG_PROVIDERS", ["aws", "azure", "gcp"]));
    const selectedAdapters = adapters.filter((adapter) => selectedProviders.has(adapter.provider));
    if (!selectedAdapters.length) throw new Error("CATALOG_PROVIDERS did not select a supported provider");
    const carryClient = await pool.connect();
    try {
      await carryClient.query("BEGIN");
      await copyUnselectedProviders(carryClient, versionId, [...selectedProviders]);
      await carryClient.query("COMMIT");
    } catch (error) {
      await carryClient.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      carryClient.release();
    }
    for (const adapter of selectedAdapters) {
      const syncId = randomUUID();
      await pool.query(
        "INSERT INTO catalog_syncs (id, version_id, provider, status) VALUES ($1,$2,$3,'running')",
        [syncId, versionId, adapter.provider],
      );
      try {
        // Provider downloads can take several minutes. Do not hold an idle
        // database connection while waiting for their public pricing APIs.
        const products = await adapter.fetchProducts();
        if (!products.length) throw new Error(`${adapter.provider} returned no supported products`);
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await insertProducts(client, versionId, products);
          await client.query(
            "UPDATE catalog_syncs SET status='succeeded', records_imported=$2, completed_at=now() WHERE id=$1",
            [syncId, products.length],
          );
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK").catch(() => undefined);
          throw error;
        } finally {
          client.release();
        }
        console.log(`${adapter.provider}: imported ${products.length} products`);
      } catch (error) {
        await pool.query(
          "UPDATE catalog_syncs SET status='failed', error=$2, completed_at=now() WHERE id=$1",
          [syncId, error instanceof Error ? error.message : String(error)],
        );
        throw error;
      }
    }

    const client = await pool.connect();
    try {
      await activateCatalog(client, versionId);
      activated = true;
      try {
        await cleanupCatalogVersions(client);
        await client.query("DELETE FROM catalog_versions WHERE status='staging' AND id<>$1", [versionId]);
      } catch (error) {
        console.warn("Catalog activated, but old-version cleanup failed", error);
      }
    } finally {
      client.release();
    }
    console.log(`Activated catalog ${versionId}`);
  } catch (error) {
    if (!activated) {
      await pool.query("UPDATE catalog_versions SET status='failed' WHERE id=$1", [versionId]).catch(() => undefined);
    }
    throw error;
  } finally {
    await closePool();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
