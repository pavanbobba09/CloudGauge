// TypeScript interfaces for backend
// Keeping consistent with frontend types but adding backend-specific fields

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  defaultRegion: string;
  preferredProviders: string[];
  budgetAlerts: boolean;
  emailNotifications: boolean;
}

export interface ResourceSpecs {
  services?: ServiceType[];
  cpuCores: number;
  ramGB: number;
  storageGB: number;
  region: string;
  operatingSystem: 'linux' | 'windows';
  instanceFamily?: InstanceFamily;
  databaseEngine?: DatabaseEngine;
  databaseSize?: number;
  gpuRequired?: boolean;
}

export type ServiceType = 
  // Compute Services (Major cost drivers)
  | 'ec2' | 'lambda' | 'ecs' | 'eks' | 'batch' | 'lightsail' | 'fargate'
  // Storage Services (High volume costs)  
  | 's3' | 'ebs' | 'efs' | 'fsx' | 'glacier' | 'snowball' | 'backup'
  // Database Services (Expensive managed services)
  | 'rds' | 'dynamodb' | 'redshift' | 'elasticache' | 'documentdb' | 'neptune' | 'timestream'
  // Network & CDN (Data transfer costs)
  | 'cloudfront' | 'elb' | 'vpc' | 'directconnect' | 'apigateway' | 'route53' | 'transit-gateway'
  // Analytics & Big Data (Compute intensive)
  | 'emr' | 'glue' | 'kinesis' | 'opensearch' | 'athena' | 'quicksight' | 'msk' | 'databrew'
  // AI/ML Services (High compute costs)
  | 'sagemaker' | 'bedrock' | 'rekognition' | 'comprehend' | 'textract'
  // Enterprise & Productivity (High per-user costs)
  | 'workspaces' | 'appstream' | 'connect' | 'chime'
  // Security & Compliance (Enterprise costs)
  | 'guardduty' | 'inspector' | 'macie' | 'security-hub'
  // Container & Orchestration
  | 'ecr' | 'app-runner' | 'copilot'
  // Migration & Hybrid
  | 'dms' | 'datasync' | 'storage-gateway';

export type InstanceFamily = 'general' | 'compute' | 'memory' | 'storage' | 'gpu';

export type DatabaseEngine = 'mysql' | 'postgresql' | 'oracle' | 'sqlserver' | 'mariadb';

export interface CloudProvider {
  id: 'aws' | 'gcp' | 'azure';
  name: string;
  logo: string;
  color: string;
}

export interface PricingResult {
  provider: CloudProvider;
  monthlycost: number;
  instanceType: string;
  region: string;
  breakdown: CostBreakdown;
  detailedBreakdown?: any;
  specs?: ResourceSpecs;
  savings?: SavingsInfo;
  rawData?: any; // Store raw API response for debugging
}

export interface CostBreakdown {
  compute: number;
  storage: number;
  network: number;
  database?: number;
  serverless?: number;
  licenses?: number; // For Windows licensing costs
}

export interface SavingsInfo {
  percentSaved: number;
  alternativeInstance: string;
  reason: string;
  monthlySavings: number;
}

export interface CostComparison {
  id: string;
  userId: string;
  specs: ResourceSpecs;
  results: PricingResult[];
  createdAt: Date;
  updatedAt: Date;
  friendlyName?: string;
  isPublic: boolean; // Allow users to share comparisons
  tags?: string[]; // For categorizing comparisons
}

// Database-specific interfaces
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  requestId?: string; // For tracking requests in logs
}

// Validation schemas
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// AWS specific types
export interface AWSInstanceType {
  instanceType: string;
  vcpu: number;
  memory: number;
  storage?: string;
  networkPerformance: string;
  pricing: {
    onDemand: number;
    reserved1Year?: number;
    reserved3Year?: number;
    spot?: number;
  };
}

// GCP specific types
export interface GCPMachineType {
  name: string;
  guestCpus: number;
  memoryMb: number;
  isSharedCpu: boolean;
  pricing: {
    onDemand: number;
    preemptible?: number;
    committed1Year?: number;
    committed3Year?: number;
  };
}

// Azure specific types
export interface AzureVMSize {
  name: string;
  numberOfCores: number;
  memoryInMB: number;
  maxDataDiskCount: number;
  osDiskSizeInMB: number;
  pricing: {
    payAsYouGo: number;
    reserved1Year?: number;
    reserved3Year?: number;
    spot?: number;
  };
}

// Cache entry structure
export interface CachedPricing {
  provider: string;
  region: string;
  instanceTypes: { [key: string]: any };
  lastUpdated: Date;
  expiresAt: Date;
}

// Monitoring and logging
export interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  metadata?: any;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  metadata?: any;
}

// Lambda-specific types
export interface LambdaEvent {
  httpMethod: string;
  path: string;
  pathParameters?: { [key: string]: string };
  queryStringParameters?: { [key: string]: string };
  headers: { [key: string]: string };
  body?: string;
  requestContext: {
    requestId: string;
    identity: {
      sourceIp: string;
      userAgent?: string;
    };
  };
}

export interface LambdaResponse {
  statusCode: number;
  headers: { [key: string]: string };
  body: string;
  isBase64Encoded?: boolean;
}
