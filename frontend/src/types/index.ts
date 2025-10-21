// TypeScript interfaces for our application
// Using a mix of naming conventions as requested for natural coding style

export interface CloudProvider {
  id: 'aws' | 'gcp' | 'azure';
  name: string;
  logo: string;
  color: string;
}

export interface ResourceSpecs {
  // Service selection
  services: ServiceType[];
  
  // Compute specifications (EC2)
  cpuCores: number;
  ramGB: number;
  instanceFamily?: 'general' | 'compute' | 'memory' | 'storage' | 'gpu';
  operatingSystem: 'linux' | 'windows';
  
  // Storage specifications (S3, EBS)
  storageGB: number;
  storageType: 's3-standard' | 's3-ia' | 's3-glacier' | 'ebs-gp3' | 'ebs-io2';
  
  // Database specifications (RDS)
  databaseEngine?: 'mysql' | 'postgres' | 'oracle' | 'sqlserver';
  databaseSize?: number;
  multiAZ?: boolean;
  
  // Network specifications
  dataTransferGB?: number;
  
  // General
  region: string;
  usageDuration: 'hourly' | 'monthly' | 'yearly';
  
  // Advanced options
  gpuRequired?: boolean;
  highAvailability?: boolean;
  backupRequired?: boolean;
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

export interface PricingResult {
  provider: CloudProvider;
  monthlycost: number;  // Keep backend naming for compatibility
  totalMonthlyCost?: number;  // New frontend-preferred name
  instanceType: string;
  region: string;
  breakdown: CostBreakdown;
  detailedBreakdown?: any;
  specs?: ResourceSpecs;
  savings?: SavingsInfo;
  serviceBreakdown?: ServiceCost[];  // For backwards compatibility
  recommendations?: RecommendationInfo[];
  estimatedSavings?: number;
}

export interface CostBreakdown {
  compute: number;
  storage: number;
  network: number;
  database?: number;
  serverless?: number;
  licenses?: number;
}

export interface SavingsInfo {
  percentSaved: number;
  alternativeInstance: string;
  reason: string;
  monthlySavings: number;
}

export interface ServiceCost {
  serviceType: ServiceType;
  serviceName: string;
  monthlyCost: number;
  instanceType?: string;
  specifications: any;
  details: {
    hourlyRate?: number;
    storageRate?: number;
    dataTransferRate?: number;
  };
}

export interface RecommendationInfo {
  serviceType: ServiceType;
  currentCost: number;
  recommendedCost: number;
  savings: number;
  savingsPercent: number;
  recommendation: string;
  reason: string;
}

export interface CostComparison {
  id?: string;
  userId?: string;
  specs: ResourceSpecs;
  results: PricingResult[];
  createdAt: Date;
  // personal touch - naming this field for better UX
  friendlyName?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  // learned from previous projects - users love saved preferences
  preferences?: {
    defaultRegion: string;
    preferredProviders: string[];
    budgetAlerts: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form validation types - keeping it simple but extensible
export interface FormErrors {
  [key: string]: string | undefined;
}

export interface LoadingState {
  isLoading: boolean;
  operation?: string; // what we're currently loading
}

// Chart data structure for visualizations
export interface ChartDataPoint {
  label: string;
  value: number;
  color: string;
  provider?: string;
}

// Redis cache structure for pricing data
export interface CachedPricing {
  provider: string;
  region: string;
  instanceTypes: {
    [key: string]: {
      hourlyRate: number;
      specs: {
        cpu: number;
        memory: number;
        storage?: number;
      };
    };
  };
  lastUpdated: Date;
}
