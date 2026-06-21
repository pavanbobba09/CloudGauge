import type { CatalogOption, Category, Provider } from "@/lib/types";

const EFFECTIVE_AT = "2025-01-01T00:00:00.000Z";

function option(
  provider: Provider,
  region: string,
  category: Category,
  sku: string,
  productName: string,
  meter: string,
  unit: string,
  dimension: string,
  price: string,
  serviceCode = `${provider}-${category}`,
  serviceName = category.replaceAll("_", " "),
): CatalogOption {
  const meterId = `fallback:${provider}:${region}:${sku}:${dimension}`;
  return {
    id: `${provider}:${region}:${sku}`,
    provider,
    region,
    category,
    serviceCode,
    serviceName,
    sku,
    productName,
    meterId,
    meterName: meter,
    unit,
    dimension,
    effectiveAt: EFFECTIVE_AT,
    tiers: [{ startAmount: "0", unitPrice: price }],
  };
}

// These records are deliberately dated and only make a fresh checkout usable.
// Production deployments replace them through the catalog synchronization worker.
export const FALLBACK_CATALOG: CatalogOption[] = [
  option("aws", "us-east-1", "compute", "t3.medium", "EC2 t3.medium Linux", "On-demand instance", "Hrs", "runtime", "0.0416"),
  option("aws", "us-east-1", "block_storage", "gp3", "EBS General Purpose SSD (gp3)", "Provisioned storage", "GB-Mo", "storage", "0.08"),
  option("aws", "us-east-1", "block_storage", "gp3-iops", "EBS gp3 additional IOPS", "Provisioned IOPS", "IOPS-Mo", "iops", "0.005"),
  option("aws", "us-east-1", "object_storage", "s3-standard", "S3 Standard", "Storage", "GB-Mo", "storage", "0.023"),
  option("aws", "us-east-1", "object_storage", "s3-put", "S3 Standard PUT requests", "Write requests", "1K requests", "write_operations", "0.005"),
  option("aws", "us-east-1", "database", "db.t3.medium", "RDS PostgreSQL db.t3.medium", "Database instance", "Hrs", "runtime", "0.082"),
  option("aws", "us-east-1", "egress", "internet-egress", "AWS Internet Data Transfer", "Outbound data", "GB", "egress", "0.09"),

  option("azure", "eastus", "compute", "Standard_B2s", "Azure VM Standard B2s Linux", "On-demand virtual machine", "Hrs", "runtime", "0.0416"),
  option("azure", "eastus", "block_storage", "E10-LRS", "Standard SSD E10 LRS", "Provisioned disk", "GB-Mo", "storage", "0.15"),
  option("azure", "eastus", "object_storage", "hot-lrs", "Blob Storage Hot LRS", "Stored data", "GB-Mo", "storage", "0.0184"),
  option("azure", "eastus", "object_storage", "hot-write", "Blob Storage Hot write operations", "Write operations", "10K operations", "write_operations", "0.065"),
  option("azure", "eastus", "database", "b2s-flex", "Azure PostgreSQL Flexible B2s", "Database compute", "Hrs", "runtime", "0.096"),
  option("azure", "eastus", "egress", "zone1-egress", "Azure Bandwidth Zone 1", "Outbound data", "GB", "egress", "0.087"),

  option("gcp", "us-central1", "compute", "e2-medium", "Compute Engine e2-medium", "On-demand VM", "Hrs", "runtime", "0.0335"),
  option("gcp", "us-central1", "block_storage", "pd-balanced", "Balanced Persistent Disk", "Provisioned storage", "GB-Mo", "storage", "0.10"),
  option("gcp", "us-central1", "object_storage", "standard-regional", "Cloud Storage Standard Regional", "Stored data", "GiBy.mo", "storage", "0.02"),
  option("gcp", "us-central1", "object_storage", "class-a", "Cloud Storage Class A operations", "Write operations", "1K operations", "write_operations", "0.005"),
  option("gcp", "us-central1", "database", "db-custom-2-7680", "Cloud SQL PostgreSQL 2 vCPU / 7.5 GB", "Database compute", "Hrs", "runtime", "0.1016"),
  option("gcp", "us-central1", "egress", "premium-egress", "Premium Tier Internet Egress", "Outbound data", "GiBy", "egress", "0.12"),

  option("aws", "us-east-1", "other", "lambda-requests", "AWS Lambda", "Requests", "1M requests", "operations", "0.20", "AWSLambda", "AWS Lambda"),
  option("aws", "us-east-1", "other", "fargate-vcpu", "AWS Fargate", "vCPU runtime", "Hrs", "runtime", "0.04048", "AmazonECS", "Amazon ECS / Fargate"),
  option("aws", "us-east-1", "other", "dynamodb-write", "Amazon DynamoDB", "Write request units", "1M requests", "write_operations", "1.25", "AmazonDynamoDB", "Amazon DynamoDB"),
  option("aws", "us-east-1", "other", "cloudfront-egress", "Amazon CloudFront", "North America data transfer", "GB", "egress", "0.085", "AmazonCloudFront", "Amazon CloudFront"),
  option("aws", "us-east-1", "other", "api-gateway", "Amazon API Gateway", "REST API requests", "1M requests", "operations", "3.50", "AmazonApiGateway", "Amazon API Gateway"),
  option("aws", "us-east-1", "other", "elasticache-node", "Amazon ElastiCache", "Cache node runtime", "Hrs", "runtime", "0.017", "AmazonElastiCache", "Amazon ElastiCache"),
  option("aws", "us-east-1", "other", "eks-cluster", "Amazon EKS", "Cluster runtime", "Hrs", "runtime", "0.10", "AmazonEKS", "Amazon EKS"),
  option("aws", "us-east-1", "other", "cloudwatch-metrics", "Amazon CloudWatch", "Custom metrics", "1K metrics", "operations", "0.30", "AmazonCloudWatch", "Amazon CloudWatch"),

  option("azure", "eastus", "other", "functions-executions", "Azure Functions", "Executions", "1M executions", "operations", "0.20", "AzureFunctions", "Azure Functions"),
  option("azure", "eastus", "other", "app-service-b1", "Azure App Service B1", "Instance runtime", "Hrs", "runtime", "0.075", "AzureAppService", "Azure App Service"),
  option("azure", "eastus", "other", "cosmos-request", "Azure Cosmos DB", "Request units", "1M request units", "operations", "0.25", "AzureCosmosDB", "Azure Cosmos DB"),
  option("azure", "eastus", "other", "aks-cluster", "Azure Kubernetes Service", "Management fee", "Hrs", "runtime", "0.10", "AzureKubernetesService", "Azure Kubernetes Service"),
  option("azure", "eastus", "other", "container-instance", "Azure Container Instances", "vCPU runtime", "Hrs", "runtime", "0.0432", "AzureContainerInstances", "Azure Container Instances"),
  option("azure", "eastus", "other", "cdn-egress", "Azure CDN", "Outbound data", "GB", "egress", "0.081", "AzureCDN", "Azure CDN"),
  option("azure", "eastus", "other", "monitor-ingestion", "Azure Monitor", "Log ingestion", "GB", "storage", "2.30", "AzureMonitor", "Azure Monitor"),
  option("azure", "eastus", "other", "service-bus", "Azure Service Bus", "Messaging operations", "1M operations", "operations", "0.05", "AzureServiceBus", "Azure Service Bus"),

  option("gcp", "us-central1", "other", "cloud-run-vcpu", "Google Cloud Run", "vCPU runtime", "Hrs", "runtime", "0.0864", "CloudRun", "Cloud Run"),
  option("gcp", "us-central1", "other", "functions-invocations", "Cloud Functions", "Invocations", "1M invocations", "operations", "0.40", "CloudFunctions", "Cloud Functions"),
  option("gcp", "us-central1", "other", "gke-cluster", "Google Kubernetes Engine", "Cluster management", "Hrs", "runtime", "0.10", "GoogleKubernetesEngine", "Google Kubernetes Engine"),
  option("gcp", "us-central1", "other", "bigquery-analysis", "Google BigQuery", "Analysis", "TiB", "storage", "6.25", "BigQuery", "BigQuery"),
  option("gcp", "us-central1", "other", "firestore-reads", "Google Firestore", "Document reads", "100K operations", "operations", "0.06", "Firestore", "Firestore"),
  option("gcp", "us-central1", "other", "memorystore-basic", "Google Memorystore", "Instance runtime", "Hrs", "runtime", "0.049", "Memorystore", "Memorystore"),
  option("gcp", "us-central1", "other", "cloud-cdn-egress", "Google Cloud CDN", "Cache egress", "GiBy", "egress", "0.08", "CloudCDN", "Cloud CDN"),
  option("gcp", "us-central1", "other", "pubsub-throughput", "Google Cloud Pub/Sub", "Message throughput", "GiBy", "operations", "0.04", "PubSub", "Pub/Sub"),
];

export const FALLBACK_EFFECTIVE_AT = EFFECTIVE_AT;
