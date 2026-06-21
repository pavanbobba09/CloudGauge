# CloudGauge

CloudGauge is an anonymous, pre-deployment cost estimator for AWS, Azure, and Google Cloud. It calculates public on-demand USD estimates from explicit provider-specific services and keeps pricing assumptions visible.

## What is included

- Single-cloud and side-by-side multi-cloud configuration
- Compute, block storage, object storage, PostgreSQL, and internet egress meters
- One-time and recurring runtime schedules
- Decimal and tier-aware pricing calculations
- Hourly, daily, monthly, per-service, and provider totals
- Optional OpenAI structured workload parsing with mandatory user confirmation
- PostgreSQL catalog versioning with atomic activation and last-known-good fallback
- AWS, Azure, and GCP public pricing adapters plus a nightly GitHub Actions workflow

The bundled catalog is intentionally marked as a dated fallback. It exists for local evaluation only. Run the catalog worker before using estimates for purchasing decisions.

## Local development

Requirements: Node.js 20+, npm, and optionally Docker for PostgreSQL.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Without `DATABASE_URL`, the app uses the fallback catalog. It never stores workloads or estimates.

## Production catalog

Start PostgreSQL, migrate the schema, and run a synchronization:

```bash
docker compose up -d postgres
npm run db:migrate
npm run catalog:sync
```

The GCP public catalog requires `GCP_API_KEY`. Region lists are controlled by `AWS_REGIONS`, `AZURE_REGIONS`, and `GCP_REGIONS`. `AWS_SERVICE_CODES` selects a broad service set; `AWS_ALL_SERVICES=true` imports every regional AWS offer. `CATALOG_PROVIDERS` supports provider-by-provider staged rollouts. The refresh job stages a catalog version, activates it atomically, retains one last-known-good version, and removes failed/older versions.

For Vercel, connect a serverless PostgreSQL integration such as Neon so `DATABASE_URL` is available to Production, Preview, and Development. Run migrations and the catalog worker from a scheduled environment that permits long-running jobs; full catalog ingestion is intentionally not executed inside a request handler.

## Optional AI parser

Set `OPENAI_API_KEY` to expose **Describe with AI**. `AI_MODEL` defaults to `gpt-5.4-nano`. The model returns search criteria and usage assumptions, never prices. Every generated line remains unconfirmed until reviewed in the UI. The deterministic pricing engine is the only component allowed to calculate costs.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Pricing boundaries

MVP estimates use USD public on-demand list prices. Taxes, credits, free tiers, commitments, negotiated discounts, and resource provisioning are excluded. Provider configurations are selected independently and may not be technically equivalent.
