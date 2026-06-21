CREATE TABLE IF NOT EXISTS catalog_versions (
  id UUID PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('staging', 'active', 'retired', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS catalog_syncs (
  id UUID PRIMARY KEY,
  version_id UUID NOT NULL REFERENCES catalog_versions(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('aws', 'azure', 'gcp')),
  status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  records_imported INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error TEXT
);

CREATE TABLE IF NOT EXISTS regions (
  id TEXT NOT NULL,
  version_id UUID NOT NULL REFERENCES catalog_versions(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('aws', 'azure', 'gcp')),
  name TEXT NOT NULL,
  PRIMARY KEY (version_id, provider, id)
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT NOT NULL,
  version_id UUID NOT NULL REFERENCES catalog_versions(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('aws', 'azure', 'gcp')),
  region_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('compute', 'block_storage', 'object_storage', 'database', 'egress', 'other')),
  service_code TEXT NOT NULL,
  service_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}',
  PRIMARY KEY (version_id, id),
  FOREIGN KEY (version_id, provider, region_id) REFERENCES regions(version_id, provider, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meters (
  id TEXT NOT NULL,
  version_id UUID NOT NULL REFERENCES catalog_versions(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  dimension TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  effective_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (version_id, id),
  FOREIGN KEY (version_id, product_id) REFERENCES products(version_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS price_tiers (
  version_id UUID NOT NULL REFERENCES catalog_versions(id) ON DELETE CASCADE,
  meter_id TEXT NOT NULL,
  start_amount NUMERIC(30, 12) NOT NULL,
  unit_price NUMERIC(30, 12) NOT NULL,
  PRIMARY KEY (version_id, meter_id, start_amount),
  FOREIGN KEY (version_id, meter_id) REFERENCES meters(version_id, id) ON DELETE CASCADE
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS service_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS service_name TEXT;
UPDATE products SET service_code = provider || '-' || category WHERE service_code IS NULL;
UPDATE products SET service_name = category WHERE service_name IS NULL;
ALTER TABLE products ALTER COLUMN service_code SET NOT NULL;
ALTER TABLE products ALTER COLUMN service_name SET NOT NULL;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE products ADD CONSTRAINT products_category_check
  CHECK (category IN ('compute', 'block_storage', 'object_storage', 'database', 'egress', 'other'));

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_version_id_region_id_fkey;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_version_id_provider_region_id_fkey;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_region_fkey;
ALTER TABLE regions DROP CONSTRAINT IF EXISTS regions_pkey;
ALTER TABLE regions ADD CONSTRAINT regions_pkey PRIMARY KEY (version_id, provider, id);
ALTER TABLE products ADD CONSTRAINT products_region_fkey
  FOREIGN KEY (version_id, provider, region_id)
  REFERENCES regions(version_id, provider, id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS products_lookup
  ON products (version_id, provider, category, region_id);

CREATE INDEX IF NOT EXISTS products_service_lookup
  ON products (version_id, provider, service_code, region_id);

CREATE INDEX IF NOT EXISTS products_search
  ON products USING GIN (to_tsvector('simple', name || ' ' || sku || ' ' || service_name));

CREATE INDEX IF NOT EXISTS meters_product_lookup
  ON meters (version_id, product_id);
