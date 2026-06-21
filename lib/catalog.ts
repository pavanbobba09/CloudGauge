import { getPool } from "@/lib/db";
import { FALLBACK_CATALOG, FALLBACK_EFFECTIVE_AT } from "@/lib/fallback-catalog";
import type { CatalogOption, Category, Provider } from "@/lib/types";

export type CatalogSnapshot = {
  options: CatalogOption[];
  source: "database" | "fallback" | "mixed";
  effectiveAt: string;
  total: number;
  page: number;
  pageSize: number;
};

export type CatalogFilters = {
  provider?: Provider;
  category?: Category;
  service?: string;
  region?: string;
  query?: string;
  page?: number;
  pageSize?: number;
};

export type CatalogFacets = {
  source: "database" | "fallback";
  services: Array<{ code: string; name: string; provider: Provider }>;
  regions: Array<{ id: string; name: string; provider: Provider }>;
};

type CatalogRow = {
  id: string;
  provider: Provider;
  region: string;
  category: Category;
  service_code: string;
  service_name: string;
  sku: string;
  product_name: string;
  meter_id: string;
  meter_name: string;
  unit: string;
  dimension: string;
  effective_at: Date;
  tiers: Array<{ startAmount: string; unitPrice: string }>;
};

function mapRow(row: CatalogRow): CatalogOption {
  return {
    id: row.id,
    provider: row.provider,
    region: row.region,
    category: row.category,
    serviceCode: row.service_code,
    serviceName: row.service_name,
    sku: row.sku,
    productName: row.product_name,
    meterId: row.meter_id,
    meterName: row.meter_name,
    unit: row.unit,
    dimension: row.dimension,
    effectiveAt: row.effective_at.toISOString(),
    tiers: row.tiers,
  };
}

function filterFallback(options: CatalogOption[], filters: CatalogFilters): CatalogOption[] {
  const query = filters.query?.trim().toLowerCase();
  return options.filter((item) => {
    if (filters.provider && item.provider !== filters.provider) return false;
    if (filters.category && item.category !== filters.category) return false;
    if (filters.service && item.serviceCode !== filters.service) return false;
    if (filters.region && item.region !== filters.region) return false;
    if (!query) return true;
    return `${item.serviceName} ${item.productName} ${item.sku} ${item.meterName} ${item.dimension}`
      .toLowerCase()
      .includes(query);
  });
}

function fallbackSnapshot(filters: CatalogFilters): CatalogSnapshot {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));
  const matches = filterFallback(FALLBACK_CATALOG, filters);
  return {
    options: matches.slice((page - 1) * pageSize, page * pageSize),
    source: "fallback",
    effectiveAt: FALLBACK_EFFECTIVE_AT,
    total: matches.length,
    page,
    pageSize,
  };
}

const SELECT_COLUMNS = `
  SELECT p.id, p.provider, p.region_id AS region, p.category, p.service_code, p.service_name,
         p.sku, p.name AS product_name, m.id AS meter_id, m.name AS meter_name,
         m.unit, m.dimension, m.effective_at,
         json_agg(json_build_object(
           'startAmount', t.start_amount::text,
           'unitPrice', t.unit_price::text
         ) ORDER BY t.start_amount) AS tiers
  FROM products p
  JOIN meters m ON m.version_id = p.version_id AND m.product_id = p.id
  JOIN price_tiers t ON t.version_id = p.version_id AND t.meter_id = m.id
`;

export async function getCatalog(filters: CatalogFilters = {}): Promise<CatalogSnapshot> {
  const pool = getPool();
  if (!pool) return fallbackSnapshot(filters);

  try {
    const version = await pool.query<{ id: string; activated_at: Date }>(
      "SELECT id, activated_at FROM catalog_versions WHERE status='active' ORDER BY activated_at DESC LIMIT 1",
    );
    if (!version.rows[0]) return fallbackSnapshot(filters);

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));
    const values: unknown[] = [version.rows[0].id];
    const where = ["p.version_id = $1"];
    const add = (sql: string, value: unknown) => {
      values.push(value);
      where.push(sql.replace("?", `$${values.length}`));
    };
    if (filters.provider) add("p.provider = ?", filters.provider);
    if (filters.category) add("p.category = ?", filters.category);
    if (filters.service) add("p.service_code = ?", filters.service);
    if (filters.region) add("p.region_id = ?", filters.region);
    if (filters.query?.trim()) add(
      "(p.name ILIKE ? OR p.sku ILIKE ? OR p.service_name ILIKE ? OR m.name ILIKE ?)",
      `%${filters.query.trim()}%`,
    );
    // A search expression has four placeholders that share one parameter.
    if (filters.query?.trim()) {
      const position = values.length;
      where[where.length - 1] = where[where.length - 1].replaceAll("?", `$${position}`);
    }

    const count = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM (
        SELECT m.id FROM products p JOIN meters m ON m.version_id=p.version_id AND m.product_id=p.id
        WHERE ${where.join(" AND ")} GROUP BY m.id
      ) matches`,
      values,
    );
    if (filters.provider && Number(count.rows[0]?.count ?? 0) === 0) {
      const providerExists = await pool.query(
        "SELECT 1 FROM products WHERE version_id=$1 AND provider=$2 LIMIT 1",
        [version.rows[0].id, filters.provider],
      );
      if (!providerExists.rowCount) return fallbackSnapshot(filters);
    }
    values.push(pageSize, (page - 1) * pageSize);
    const rows = await pool.query<CatalogRow>(`${SELECT_COLUMNS}
      WHERE ${where.join(" AND ")}
      GROUP BY p.id, p.provider, p.region_id, p.category, p.service_code, p.service_name,
               p.sku, p.name, m.id, m.name, m.unit, m.dimension, m.effective_at
      ORDER BY p.provider, p.service_name, p.name, m.name
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `, values);

    return {
      options: rows.rows.map(mapRow),
      source: "database",
      effectiveAt: version.rows[0].activated_at.toISOString(),
      total: Number(count.rows[0]?.count ?? 0),
      page,
      pageSize,
    };
  } catch (error) {
    console.error("Catalog database unavailable; using fallback catalog", error);
    return fallbackSnapshot(filters);
  }
}

export async function getMetersById(ids: string[]): Promise<CatalogSnapshot> {
  const pool = getPool();
  if (!pool) {
    const wanted = new Set(ids);
    const options = FALLBACK_CATALOG.filter((option) => wanted.has(option.meterId));
    return { options, source: "fallback", effectiveAt: FALLBACK_EFFECTIVE_AT, total: options.length, page: 1, pageSize: options.length };
  }
  try {
    const version = await pool.query<{ id: string; activated_at: Date }>(
      "SELECT id, activated_at FROM catalog_versions WHERE status='active' ORDER BY activated_at DESC LIMIT 1",
    );
    if (!version.rows[0]) return fallbackSnapshot({});
    const rows = await pool.query<CatalogRow>(`${SELECT_COLUMNS}
      WHERE p.version_id = $1 AND m.id = ANY($2::text[])
      GROUP BY p.id, p.provider, p.region_id, p.category, p.service_code, p.service_name,
               p.sku, p.name, m.id, m.name, m.unit, m.dimension, m.effective_at
    `, [version.rows[0].id, ids]);
    const options = rows.rows.map(mapRow);
    const found = new Set(options.map((option) => option.meterId));
    const fallback = FALLBACK_CATALOG.filter((option) => ids.includes(option.meterId) && !found.has(option.meterId));
    const combined = [...options, ...fallback];
    return {
      options: combined,
      source: fallback.length ? "mixed" : "database",
      effectiveAt: fallback.length ? FALLBACK_EFFECTIVE_AT : version.rows[0].activated_at.toISOString(),
      total: combined.length,
      page: 1,
      pageSize: combined.length,
    };
  } catch (error) {
    console.error("Meter lookup failed", error);
    return fallbackSnapshot({});
  }
}

export async function getCatalogFacets(provider?: Provider): Promise<CatalogFacets> {
  const pool = getPool();
  if (!pool) {
    const options = provider ? FALLBACK_CATALOG.filter((item) => item.provider === provider) : FALLBACK_CATALOG;
    return {
      source: "fallback",
      services: [...new Map(options.map((item) => [`${item.provider}:${item.serviceCode}`, {
        code: item.serviceCode, name: item.serviceName, provider: item.provider,
      }])).values()].sort((a, b) => a.name.localeCompare(b.name)),
      regions: [...new Map(options.map((item) => [`${item.provider}:${item.region}`, {
        id: item.region, name: item.region, provider: item.provider,
      }])).values()].sort((a, b) => a.id.localeCompare(b.id)),
    };
  }
  try {
    const values: unknown[] = [];
    const providerFilter = provider ? (values.push(provider), "AND p.provider = $1") : "";
    const services = await pool.query<{ code: string; name: string; provider: Provider }>(`
      SELECT DISTINCT p.service_code AS code, p.service_name AS name, p.provider
      FROM products p JOIN catalog_versions v ON v.id=p.version_id
      WHERE v.status='active' ${providerFilter}
      ORDER BY name
    `, values);
    const regions = await pool.query<{ id: string; name: string; provider: Provider }>(`
      SELECT DISTINCT r.id, r.name, r.provider
      FROM regions r JOIN catalog_versions v ON v.id=r.version_id
      WHERE v.status='active' ${provider ? "AND r.provider = $1" : ""}
      ORDER BY name
    `, values);
    const presentProviders = new Set(services.rows.map((item) => item.provider));
    const missingFallback = FALLBACK_CATALOG.filter((item) => !presentProviders.has(item.provider));
    const fallbackServices = [...new Map(missingFallback.map((item) => [`${item.provider}:${item.serviceCode}`, {
      code: item.serviceCode, name: item.serviceName, provider: item.provider,
    }])).values()];
    const fallbackRegions = [...new Map(missingFallback.map((item) => [`${item.provider}:${item.region}`, {
      id: item.region, name: item.region, provider: item.provider,
    }])).values()];
    return { source: "database", services: [...services.rows, ...fallbackServices], regions: [...regions.rows, ...fallbackRegions] };
  } catch (error) {
    console.error("Catalog facets unavailable", error);
    return getCatalogFacetsFallback(provider);
  }
}

function getCatalogFacetsFallback(provider?: Provider): CatalogFacets {
  const options = provider ? FALLBACK_CATALOG.filter((item) => item.provider === provider) : FALLBACK_CATALOG;
  return {
    source: "fallback",
    services: [...new Map(options.map((item) => [`${item.provider}:${item.serviceCode}`, { code: item.serviceCode, name: item.serviceName, provider: item.provider }])).values()],
    regions: [...new Map(options.map((item) => [`${item.provider}:${item.region}`, { id: item.region, name: item.region, provider: item.provider }])).values()],
  };
}
