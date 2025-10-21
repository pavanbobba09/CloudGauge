import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse, ResourceSpecs, PricingResult, CloudProvider } from '../types';

const router = Router();

// Enhanced cost calculation with service-specific pricing
router.post('/calculate-costs', asyncHandler(async (req: any, res: any) => {
  const specs: ResourceSpecs = req.body;
  
  // Enhanced providers with more details
  const providers: CloudProvider[] = [
    { id: 'aws', name: 'Amazon Web Services', logo: '☁️', color: '#FF9900' },
    { id: 'gcp', name: 'Google Cloud Platform', logo: '🌩️', color: '#4285F4' },
    { id: 'azure', name: 'Microsoft Azure', logo: '⚡', color: '#0078D4' },
  ];

  // Service-specific cost calculators
  const calculateServiceCosts = (provider: CloudProvider, specs: ResourceSpecs) => {
    const costs = { compute: 0, storage: 0, network: 0, database: 0, serverless: 0 };
    let breakdown: any = {};

    // Regional pricing multipliers (simplified)
    const regionMultipliers: { [key: string]: number } = {
      'us-east-1': 1.0,    // baseline
      'us-west-2': 1.05,   // slightly higher
      'eu-west-1': 1.15,   // European pricing
      'ap-southeast-1': 1.2, // APAC premium
      'ap-northeast-1': 1.25, // Japan premium
      'ca-central-1': 1.1,  // Canada pricing
    };
    
    const regionMultiplier = regionMultipliers[specs.region] || 1.0;
    
    // Provider-specific multipliers for competitive positioning
    const providerMultipliers: { [key: string]: number } = {
      aws: 1.0,     // baseline (market leader)
      gcp: 0.85,    // competitive pricing
      azure: 0.95,  // enterprise-focused
    };
    
    const providerMultiplier = providerMultipliers[provider.id] || 1.0;
    
    // OS licensing costs (Windows adds premium)
    const osMultiplier = specs.operatingSystem === 'windows' ? 1.4 : 1.0;

    // EC2/Compute pricing
    if (specs.services?.includes('ec2')) {
      // Instance family affects pricing
      const familyMultipliers: { [key: string]: number } = {
        general: 1.0,    // t3, m5 - baseline
        compute: 1.2,    // c5 - compute optimized premium
        memory: 1.3,     // r5 - memory premium
        storage: 1.4,    // i3 - storage optimized
        gpu: 3.5,        // p3 - GPU premium
      };
      
      const familyMultiplier = familyMultipliers[specs.instanceFamily || 'general'];
      
      // Base hourly rates (realistic AWS pricing)
      const cpuHourlyRate = 0.0464; // per vCPU hour (t3.medium baseline)
      const ramHourlyRate = 0.0116; // per GB RAM hour
      
      const hourlyCost = (
        (specs.cpuCores * cpuHourlyRate) + 
        (specs.ramGB * ramHourlyRate)
      ) * familyMultiplier * osMultiplier * regionMultiplier * providerMultiplier;
      
      costs.compute = hourlyCost * 24 * 30; // monthly cost
      
      breakdown.compute = {
        instanceFamily: specs.instanceFamily || 'general',
        hourlyCost: hourlyCost,
        monthlyCost: costs.compute,
        breakdown: {
          cpu: specs.cpuCores * cpuHourlyRate * 24 * 30 * familyMultiplier * regionMultiplier * providerMultiplier,
          memory: specs.ramGB * ramHourlyRate * 24 * 30 * familyMultiplier * regionMultiplier * providerMultiplier,
          osLicense: specs.operatingSystem === 'windows' ? costs.compute * 0.28 : 0
        }
      };
    }

    // S3 Storage pricing
    if (specs.services?.includes('s3')) {
      // S3 pricing tiers (per GB/month)
      const s3StandardRate = 0.023; // first 50TB
      const s3IARate = 0.0125;      // Infrequent Access
      const s3GlacierRate = 0.004;  // Glacier
      
      costs.storage += specs.storageGB * s3StandardRate * regionMultiplier * providerMultiplier;
      
      breakdown.s3 = {
        storageGB: specs.storageGB,
        ratePerGB: s3StandardRate * regionMultiplier * providerMultiplier,
        monthlyCost: costs.storage,
        tier: 'Standard'
      };
    }

    // EBS Storage (for EC2)
    if (specs.services?.includes('ec2') && specs.storageGB > 0) {
      // EBS gp3 pricing (most common)
      const ebsGp3Rate = 0.08; // per GB/month
      const ebsStorageCost = specs.storageGB * ebsGp3Rate * regionMultiplier * providerMultiplier;
      
      costs.storage += ebsStorageCost;
      
      breakdown.ebs = {
        storageGB: specs.storageGB,
        storageType: 'gp3',
        ratePerGB: ebsGp3Rate * regionMultiplier * providerMultiplier,
        monthlyCost: ebsStorageCost
      };
    }

    // RDS Database pricing
    if (specs.services?.includes('rds')) {
      // RDS instance pricing (roughly 2x EC2 for managed service)
      const rdsMultiplier = 2.2;
      const rdsCost = costs.compute * rdsMultiplier;
      
      costs.database = rdsCost;
      
      // Database storage cost
      const dbStorageSize = specs.databaseSize || specs.storageGB;
      const dbStorageCost = dbStorageSize * 0.115 * regionMultiplier * providerMultiplier; // RDS storage
      
      costs.storage += dbStorageCost;
      
      breakdown.rds = {
        engine: specs.databaseEngine || 'mysql',
        instanceCost: rdsCost,
        storageCost: dbStorageCost,
        totalMonthlyCost: rdsCost + dbStorageCost
      };
    }

    // Lambda pricing
    if (specs.services?.includes('lambda')) {
      const requestsPerMonth = 1000000; // 1M requests
      const avgExecutionMs = 100;       // 100ms average
      const memoryMB = Math.max(specs.ramGB * 1024 / 4, 512);
      
      const requestCost = (requestsPerMonth / 1000000) * 0.20; // $0.20 per 1M requests
      const computeCost = (requestsPerMonth * avgExecutionMs * memoryMB) / (1024 * 1000) * 0.0000166667;
      
      costs.serverless += (requestCost + computeCost) * regionMultiplier * providerMultiplier;
      
      breakdown.lambda = {
        requestsPerMonth,
        avgExecutionMs,
        memoryMB,
        requestCost,
        computeCost,
        totalMonthlyCost: (requestCost + computeCost) * regionMultiplier * providerMultiplier
      };
    }

    // Additional services pricing
    
    // ECS/Fargate pricing (container services)
    if (specs.services?.includes('ecs')) {
      const vcpuHourlyRate = 0.04048; // per vCPU hour
      const ramHourlyRate = 0.004445; // per GB RAM hour
      const containerCost = ((specs.cpuCores * vcpuHourlyRate) + (specs.ramGB * ramHourlyRate)) * 24 * 30 * regionMultiplier * providerMultiplier;
      costs.compute += containerCost;
      
      breakdown.ecs = {
        vcpuCost: specs.cpuCores * vcpuHourlyRate * 24 * 30,
        memoryCost: specs.ramGB * ramHourlyRate * 24 * 30,
        totalMonthlyCost: containerCost
      };
    }

    // EKS pricing (Kubernetes)
    if (specs.services?.includes('eks')) {
      const clusterCost = 73; // $0.10/hour cluster cost
      const nodeCost = costs.compute * 1.1; // 10% overhead for managed nodes
      const eksTotalCost = (clusterCost + nodeCost) * regionMultiplier * providerMultiplier;
      costs.compute += eksTotalCost;
      
      breakdown.eks = {
        clusterMonthlyCost: clusterCost,
        nodeMonthlyCost: nodeCost,
        totalMonthlyCost: eksTotalCost
      };
    }

    // DynamoDB pricing
    if (specs.services?.includes('dynamodb')) {
      const readCapacityUnits = 25; // RCU
      const writeCapacityUnits = 25; // WCU
      const storageGB = specs.storageGB || 25;
      
      const readCost = readCapacityUnits * 0.125 * 24 * 30; // $0.125 per RCU/hour
      const writeCost = writeCapacityUnits * 0.625 * 24 * 30; // $0.625 per WCU/hour
      const storageCost = storageGB * 0.25; // $0.25 per GB/month
      
      const dynamodbCost = (readCost + writeCost + storageCost) * regionMultiplier * providerMultiplier;
      costs.database += dynamodbCost;
      
      breakdown.dynamodb = {
        readCapacityCost: readCost,
        writeCapacityCost: writeCost,
        storageCost: storageCost,
        totalMonthlyCost: dynamodbCost
      };
    }

    // Redshift pricing (expensive!)
    if (specs.services?.includes('redshift')) {
      const nodeType = specs.cpuCores <= 2 ? 'dc2.large' : 'ds2.xlarge';
      const nodeHourlyCost = nodeType === 'dc2.large' ? 0.25 : 0.85;
      const nodeCount = Math.max(1, Math.ceil(specs.cpuCores / 2));
      
      const redshiftCost = nodeHourlyCost * nodeCount * 24 * 30 * regionMultiplier * providerMultiplier;
      costs.database += redshiftCost;
      
      breakdown.redshift = {
        nodeType,
        nodeCount,
        nodeHourlyCost,
        totalMonthlyCost: redshiftCost
      };
    }

    // ElastiCache pricing
    if (specs.services?.includes('elasticache')) {
      const cacheNodeType = specs.ramGB <= 1 ? 'cache.t3.micro' : specs.ramGB <= 4 ? 'cache.t3.small' : 'cache.m5.large';
      const cacheHourlyCost = cacheNodeType === 'cache.t3.micro' ? 0.017 : cacheNodeType === 'cache.t3.small' ? 0.034 : 0.126;
      
      const cacheCost = cacheHourlyCost * 24 * 30 * regionMultiplier * providerMultiplier;
      costs.database += cacheCost;
      
      breakdown.elasticache = {
        nodeType: cacheNodeType,
        hourlyCost: cacheHourlyCost,
        totalMonthlyCost: cacheCost
      };
    }

    // EMR pricing (Big Data)
    if (specs.services?.includes('emr')) {
      const emrInstanceCost = costs.compute * 1.5; // 50% markup for EMR
      const emrServiceFee = emrInstanceCost * 0.25; // 25% EMR service fee
      const emrTotalCost = (emrInstanceCost + emrServiceFee) * regionMultiplier * providerMultiplier;
      
      costs.compute += emrTotalCost;
      
      breakdown.emr = {
        instanceCost: emrInstanceCost,
        serviceFee: emrServiceFee,
        totalMonthlyCost: emrTotalCost
      };
    }

    // OpenSearch pricing
    if (specs.services?.includes('opensearch')) {
      const instanceType = specs.ramGB <= 4 ? 't3.small.search' : 'm5.large.search';
      const searchHourlyCost = instanceType === 't3.small.search' ? 0.036 : 0.122;
      const searchStorageCost = specs.storageGB * 0.135; // EBS storage for search
      
      const opensearchCost = (searchHourlyCost * 24 * 30 + searchStorageCost) * regionMultiplier * providerMultiplier;
      costs.database += opensearchCost;
      
      breakdown.opensearch = {
        instanceType,
        instanceMonthlyCost: searchHourlyCost * 24 * 30,
        storageMonthlyCost: searchStorageCost,
        totalMonthlyCost: opensearchCost
      };
    }

    // API Gateway pricing
    if (specs.services?.includes('apigateway')) {
      const apiCalls = 1000000; // 1M API calls per month
      const apiCost = (apiCalls / 1000000) * 3.50; // $3.50 per million calls
      const dataTransferCost = (apiCalls * 0.001) * 0.09; // data transfer
      
      const gatewayCost = (apiCost + dataTransferCost) * regionMultiplier * providerMultiplier;
      costs.network += gatewayCost;
      
      breakdown.apigateway = {
        apiCalls,
        apiCallsCost: apiCost,
        dataTransferCost,
        totalMonthlyCost: gatewayCost
      };
    }

    // Kinesis pricing
    if (specs.services?.includes('kinesis')) {
      const shards = 2; // number of shards
      const records = 1000000; // records per month
      
      const shardCost = shards * 0.015 * 24 * 30; // $0.015 per shard hour
      const recordCost = (records / 1000000) * 0.014; // $0.014 per million records
      
      const kinesisCost = (shardCost + recordCost) * regionMultiplier * providerMultiplier;
      costs.serverless += kinesisCost;
      
      breakdown.kinesis = {
        shards,
        shardMonthlyCost: shardCost,
        recordMonthlyCost: recordCost,
        totalMonthlyCost: kinesisCost
      };
    }

    // Glue pricing (ETL)
    if (specs.services?.includes('glue')) {
      const dpuHours = 10; // Data Processing Units hours per month
      const glueCost = dpuHours * 0.44 * regionMultiplier * providerMultiplier; // $0.44 per DPU hour
      costs.serverless += glueCost;
      
      breakdown.glue = {
        dpuHours,
        dpuHourlyCost: 0.44,
        totalMonthlyCost: glueCost
      };
    }

    // Athena pricing (serverless queries)
    if (specs.services?.includes('athena')) {
      const dataScannedTB = 1; // 1 TB of data scanned per month
      const athenaCost = dataScannedTB * 5.00 * regionMultiplier * providerMultiplier; // $5 per TB scanned
      costs.serverless += athenaCost;
      
      breakdown.athena = {
        dataScannedTB,
        pricePerTB: 5.00,
        totalMonthlyCost: athenaCost
      };
    }

    // QuickSight pricing
    if (specs.services?.includes('quicksight')) {
      const users = 5; // number of users
      const quicksightCost = users * 18 * regionMultiplier * providerMultiplier; // $18 per user per month
      costs.serverless += quicksightCost;
      
      breakdown.quicksight = {
        users,
        pricePerUser: 18,
        totalMonthlyCost: quicksightCost
      };
    }

    // EFS pricing (NFS file system)
    if (specs.services?.includes('efs')) {
      const efsStorageRate = 0.30; // $0.30 per GB/month for Standard
      const efsCost = specs.storageGB * efsStorageRate * regionMultiplier * providerMultiplier;
      costs.storage += efsCost;
      
      breakdown.efs = {
        storageGB: specs.storageGB,
        ratePerGB: efsStorageRate,
        totalMonthlyCost: efsCost
      };
    }

    // FSx pricing (high-performance file systems)
    if (specs.services?.includes('fsx')) {
      const fsxStorageRate = 0.65; // $0.65 per GB/month for Lustre
      const fsxCost = specs.storageGB * fsxStorageRate * regionMultiplier * providerMultiplier;
      costs.storage += fsxCost;
      
      breakdown.fsx = {
        storageGB: specs.storageGB,
        ratePerGB: fsxStorageRate,
        fileSystemType: 'Lustre',
        totalMonthlyCost: fsxCost
      };
    }

    // Direct Connect pricing
    if (specs.services?.includes('directconnect')) {
      const connectionSpeed = '1Gbps'; // assume 1Gbps connection
      const portHours = 24 * 30; // hours per month
      const portCost = portHours * 0.30; // $0.30 per hour for 1Gbps
      const dataTransferOut = 100; // 100 GB per month
      const transferCost = dataTransferOut * 0.02; // $0.02 per GB
      
      const directConnectCost = (portCost + transferCost) * regionMultiplier * providerMultiplier;
      costs.network += directConnectCost;
      
      breakdown.directconnect = {
        connectionSpeed,
        portMonthlyCost: portCost,
        dataTransferCost: transferCost,
        totalMonthlyCost: directConnectCost
      };
    }

    // Route 53 pricing (DNS)
    if (specs.services?.includes('route53')) {
      const hostedZones = 1;
      const queries = 1000000; // 1M queries per month
      
      const hostedZoneCost = hostedZones * 0.50; // $0.50 per hosted zone per month
      const queryCost = Math.max(0, (queries - 1000000000) / 1000000) * 0.40; // First 1B queries free
      
      const route53Cost = (hostedZoneCost + queryCost) * regionMultiplier * providerMultiplier;
      costs.network += route53Cost;
      
      breakdown.route53 = {
        hostedZones,
        queries,
        hostedZoneMonthlyCost: hostedZoneCost,
        queryMonthlyCost: queryCost,
        totalMonthlyCost: route53Cost
      };
    }

    // Load Balancer pricing
    if (specs.services?.includes('elb')) {
      const elbHourlyCost = 0.0225; // ALB hourly cost
      costs.network += elbHourlyCost * 24 * 30 * regionMultiplier * providerMultiplier;
      
      breakdown.loadBalancer = {
        type: 'Application Load Balancer',
        hourlyCost: elbHourlyCost * regionMultiplier * providerMultiplier,
        monthlyCost: elbHourlyCost * 24 * 30 * regionMultiplier * providerMultiplier
      };
    }

    // CloudFront CDN pricing
    if (specs.services?.includes('cloudfront')) {
      const dataTransferGB = Math.max(specs.storageGB * 0.1, 10); // 10% of storage as transfer
      const cdnCost = dataTransferGB * 0.085; // per GB transferred
      costs.network += cdnCost;
      
      breakdown.cloudfront = {
        dataTransferGB,
        ratePerGB: 0.085,
        monthlyCost: cdnCost
      };
    }

    // ===== NEW HIGH-COST SERVICES =====
    
    // Fargate pricing (serverless containers - expensive)
    if (specs.services?.includes('fargate')) {
      const vCpuHours = specs.cpuCores * 24 * 30; // monthly vCPU hours
      const memoryGBHours = specs.ramGB * 24 * 30; // monthly memory GB hours
      
      const fargateVcpuCost = vCpuHours * 0.04048; // $0.04048 per vCPU per hour
      const fargateMemoryCost = memoryGBHours * 0.004445; // $0.004445 per GB per hour
      const fargateCost = (fargateVcpuCost + fargateMemoryCost) * regionMultiplier * providerMultiplier;
      
      costs.compute += fargateCost;
      breakdown.fargate = {
        vCpuHours,
        memoryGBHours,
        vCpuMonthlyCost: fargateVcpuCost,
        memoryMonthlyCost: fargateMemoryCost,
        totalMonthlyCost: fargateCost
      };
    }

    // AWS Backup pricing
    if (specs.services?.includes('backup')) {
      const backupStorageGB = specs.storageGB * 0.3; // 30% of primary storage
      const backupCost = backupStorageGB * 0.05 * regionMultiplier * providerMultiplier; // $0.05 per GB/month
      
      costs.storage += backupCost;
      breakdown.backup = {
        backupStorageGB,
        ratePerGB: 0.05,
        totalMonthlyCost: backupCost
      };
    }

    // Timestream pricing (time-series database - expensive)
    if (specs.services?.includes('timestream')) {
      const writeRequestUnits = 100000; // 100k write requests
      const queryRequestUnits = 10000; // 10k query requests
      const memoryStorageGB = specs.storageGB * 0.1; // 10% in memory store
      const magneticStorageGB = specs.storageGB * 0.9; // 90% in magnetic store
      
      const writeCost = (writeRequestUnits / 1000000) * 0.50; // $0.50 per million writes
      const queryCost = (queryRequestUnits / 1000000) * 0.01; // $0.01 per million queries  
      const memoryCost = memoryStorageGB * 0.36; // $0.36 per GB/hour for memory
      const magneticCost = magneticStorageGB * 0.03; // $0.03 per GB/month for magnetic
      
      const timestreamCost = (writeCost + queryCost + memoryCost + magneticCost) * regionMultiplier * providerMultiplier;
      costs.database += timestreamCost;
      
      breakdown.timestream = {
        writeRequests: writeRequestUnits,
        queryRequests: queryRequestUnits,
        memoryStorageGB,
        magneticStorageGB,
        totalMonthlyCost: timestreamCost
      };
    }

    // Transit Gateway pricing (network hub - expensive)
    if (specs.services?.includes('transit-gateway')) {
      const attachments = 5; // number of VPC attachments
      const dataProcessedGB = 500; // GB processed per month
      
      const attachmentCost = attachments * 36; // $36 per attachment per month
      const dataProcessingCost = dataProcessedGB * 0.02; // $0.02 per GB processed
      
      const tgwCost = (attachmentCost + dataProcessingCost) * regionMultiplier * providerMultiplier;
      costs.network += tgwCost;
      
      breakdown['transit-gateway'] = {
        attachments,
        dataProcessedGB,
        attachmentMonthlyCost: attachmentCost,
        dataProcessingCost,
        totalMonthlyCost: tgwCost
      };
    }

    // MSK (Kafka) pricing - expensive managed streaming
    if (specs.services?.includes('msk')) {
      const brokerInstances = 3; // minimum for HA
      const instanceType = 'kafka.m5.large';
      const brokerHourlyCost = 0.252; // $0.252 per hour per broker
      const storageGB = specs.storageGB;
      const storageCost = storageGB * 0.10; // $0.10 per GB/month
      
      const mskCost = (brokerInstances * brokerHourlyCost * 24 * 30 + storageCost) * regionMultiplier * providerMultiplier;
      costs.serverless += mskCost;
      
      breakdown.msk = {
        brokerInstances,
        instanceType,
        brokerMonthlyCost: brokerInstances * brokerHourlyCost * 24 * 30,
        storageMonthlyCost: storageCost,
        totalMonthlyCost: mskCost
      };
    }

    // DataBrew pricing (visual data preparation)
    if (specs.services?.includes('databrew')) {
      const jobRuns = 20; // jobs per month
      const nodeHours = jobRuns * 2; // 2 hours per job on average
      const databrewCost = nodeHours * 0.48 * regionMultiplier * providerMultiplier; // $0.48 per node hour
      
      costs.serverless += databrewCost;
      breakdown.databrew = {
        jobRuns,
        nodeHours,
        ratePerNodeHour: 0.48,
        totalMonthlyCost: databrewCost
      };
    }

    // SageMaker pricing - VERY expensive ML platform
    if (specs.services?.includes('sagemaker')) {
      const trainingHours = 50; // training hours per month
      const endpointHours = 24 * 30; // inference endpoint always on
      const instanceType = specs.cpuCores <= 4 ? 'ml.m5.xlarge' : 'ml.m5.2xlarge';
      const trainingRate = specs.cpuCores <= 4 ? 0.269 : 0.538; // per hour
      const endpointRate = specs.cpuCores <= 4 ? 0.23 : 0.46; // per hour
      
      const trainingCost = trainingHours * trainingRate;
      const endpointCost = endpointHours * endpointRate;
      const sagemakerCost = (trainingCost + endpointCost) * regionMultiplier * providerMultiplier;
      
      costs.serverless += sagemakerCost;
      breakdown.sagemaker = {
        trainingHours,
        endpointHours,
        instanceType,
        trainingMonthlyCost: trainingCost,
        endpointMonthlyCost: endpointCost,
        totalMonthlyCost: sagemakerCost
      };
    }

    // Bedrock pricing (Generative AI - expensive)
    if (specs.services?.includes('bedrock')) {
      const inputTokens = 1000000; // 1M input tokens per month
      const outputTokens = 200000; // 200k output tokens per month
      const modelId = 'claude-v2';
      
      const inputCost = (inputTokens / 1000) * 0.008; // $0.008 per 1k input tokens
      const outputCost = (outputTokens / 1000) * 0.024; // $0.024 per 1k output tokens
      const bedrockCost = (inputCost + outputCost) * regionMultiplier * providerMultiplier;
      
      costs.serverless += bedrockCost;
      breakdown.bedrock = {
        inputTokens,
        outputTokens,
        modelId,
        inputMonthlyCost: inputCost,
        outputMonthlyCost: outputCost,
        totalMonthlyCost: bedrockCost
      };
    }

    // Rekognition pricing (Image/Video analysis)
    if (specs.services?.includes('rekognition')) {
      const imageAnalysis = 10000; // images per month
      const videoMinutes = 100; // video minutes per month
      
      const imageCost = (imageAnalysis / 1000) * 1.00; // $1.00 per 1k images
      const videoCost = videoMinutes * 0.10; // $0.10 per minute
      const rekognitionCost = (imageCost + videoCost) * regionMultiplier * providerMultiplier;
      
      costs.serverless += rekognitionCost;
      breakdown.rekognition = {
        imageAnalysis,
        videoMinutes,
        imageMonthlyCost: imageCost,
        videoMonthlyCost: videoCost,
        totalMonthlyCost: rekognitionCost
      };
    }

    // Comprehend pricing (Text analytics)
    if (specs.services?.includes('comprehend')) {
      const charactersProcessed = 1000000; // 1M characters per month
      const comprehendCost = (charactersProcessed / 10000) * 0.0001 * regionMultiplier * providerMultiplier; // $0.0001 per unit (10k chars)
      
      costs.serverless += comprehendCost;
      breakdown.comprehend = {
        charactersProcessed,
        ratePerUnit: 0.0001,
        totalMonthlyCost: comprehendCost
      };
    }

    // Textract pricing (Document extraction)
    if (specs.services?.includes('textract')) {
      const pagesProcessed = 5000; // pages per month
      const textractCost = (pagesProcessed / 1000) * 1.50 * regionMultiplier * providerMultiplier; // $1.50 per 1k pages
      
      costs.serverless += textractCost;
      breakdown.textract = {
        pagesProcessed,
        ratePer1000Pages: 1.50,
        totalMonthlyCost: textractCost
      };
    }

    // WorkSpaces pricing - EXPENSIVE virtual desktops
    if (specs.services?.includes('workspaces')) {
      const users = 10; // number of users
      const bundleType = specs.ramGB <= 4 ? 'Value' : 'Standard'; // bundle based on RAM
      const monthlyRate = bundleType === 'Value' ? 25 : 35; // per user per month
      
      const workspacesCost = users * monthlyRate * regionMultiplier * providerMultiplier;
      costs.compute += workspacesCost;
      
      breakdown.workspaces = {
        users,
        bundleType,
        monthlyRatePerUser: monthlyRate,
        totalMonthlyCost: workspacesCost
      };
    }

    // AppStream pricing (Application streaming - expensive)
    if (specs.services?.includes('appstream')) {
      const streamingHours = 8 * 22 * 10; // 8 hours/day * 22 days/month * 10 users
      const instanceType = specs.ramGB <= 8 ? 'stream.standard.medium' : 'stream.standard.large';
      const hourlyRate = instanceType === 'stream.standard.medium' ? 0.36 : 0.72;
      
      const appstreamCost = streamingHours * hourlyRate * regionMultiplier * providerMultiplier;
      costs.compute += appstreamCost;
      
      breakdown.appstream = {
        streamingHours,
        instanceType,
        hourlyRate,
        totalMonthlyCost: appstreamCost
      };
    }

    // Connect pricing (Contact center - expensive)
    if (specs.services?.includes('connect')) {
      const agentSeats = 20; // number of agent seats
      const serviceUsageMinutes = 50000; // service usage minutes per month
      
      const seatCost = agentSeats * 0.018 * 24 * 30; // $0.018 per seat per hour
      const usageCost = (serviceUsageMinutes / 60) * 0.018; // $0.018 per minute
      const connectCost = (seatCost + usageCost) * regionMultiplier * providerMultiplier;
      
      costs.serverless += connectCost;
      breakdown.connect = {
        agentSeats,
        serviceUsageMinutes,
        seatMonthlyCost: seatCost,
        usageMonthlyCost: usageCost,
        totalMonthlyCost: connectCost
      };
    }

    // Chime pricing (Communications)
    if (specs.services?.includes('chime')) {
      const proUsers = 25; // Pro users
      const basicUsers = 100; // Basic users (free)
      const meetingMinutes = 10000; // meeting minutes per month
      
      const userCost = proUsers * 3; // $3 per Pro user per month
      const meetingCost = (meetingMinutes / 1000) * 0.0017; // $0.0017 per minute (after free tier)
      const chimeCost = (userCost + meetingCost) * regionMultiplier * providerMultiplier;
      
      costs.serverless += chimeCost;
      breakdown.chime = {
        proUsers,
        basicUsers,
        meetingMinutes,
        userMonthlyCost: userCost,
        meetingMonthlyCost: meetingCost,
        totalMonthlyCost: chimeCost
      };
    }

    // GuardDuty pricing (Threat detection)
    if (specs.services?.includes('guardduty')) {
      const vpcFlowLogsGB = 100; // GB of VPC Flow Logs per month
      const dnsLogsGB = 50; // GB of DNS logs per month
      const cloudtrailEventsM = 5; // Million CloudTrail events per month
      
      const flowLogsCost = Math.max(0, vpcFlowLogsGB - 10) * 1.00; // First 10 GB free, then $1.00/GB
      const dnsCost = Math.max(0, dnsLogsGB - 10) * 0.40; // First 10 GB free, then $0.40/GB
      const cloudtrailCost = Math.max(0, cloudtrailEventsM - 5) * 2.00; // First 5M free, then $2.00/M events
      
      const guardDutyCost = (flowLogsCost + dnsCost + cloudtrailCost) * regionMultiplier * providerMultiplier;
      costs.serverless += guardDutyCost;
      
      breakdown.guardduty = {
        vpcFlowLogsGB,
        dnsLogsGB,
        cloudtrailEventsM,
        totalMonthlyCost: guardDutyCost
      };
    }

    // Inspector pricing (Security assessment)
    if (specs.services?.includes('inspector')) {
      const ec2Assessments = specs.cpuCores * 10; // assessments per month
      const containerAssessments = 1000; // container images assessed
      
      const ec2Cost = ec2Assessments * 0.30; // $0.30 per assessment
      const containerCost = containerAssessments * 0.09; // $0.09 per image
      const inspectorCost = (ec2Cost + containerCost) * regionMultiplier * providerMultiplier;
      
      costs.serverless += inspectorCost;
      breakdown.inspector = {
        ec2Assessments,
        containerAssessments,
        ec2MonthlyCost: ec2Cost,
        containerMonthlyCost: containerCost,
        totalMonthlyCost: inspectorCost
      };
    }

    // Macie pricing (Data security)
    if (specs.services?.includes('macie')) {
      const s3BucketsAnalyzed = 20;
      const objectsProcessed = 1000000; // 1M objects per month
      
      const bucketCost = s3BucketsAnalyzed * 0.10; // $0.10 per bucket per month
      const objectCost = (objectsProcessed / 1000000) * 1.25; // $1.25 per million objects
      const macieCost = (bucketCost + objectCost) * regionMultiplier * providerMultiplier;
      
      costs.serverless += macieCost;
      breakdown.macie = {
        s3BucketsAnalyzed,
        objectsProcessed,
        bucketMonthlyCost: bucketCost,
        objectMonthlyCost: objectCost,
        totalMonthlyCost: macieCost
      };
    }

    // Security Hub pricing
    if (specs.services?.includes('security-hub')) {
      const securityChecks = 100000; // security checks per month
      const complianceChecks = 50000; // compliance checks per month
      
      const securityCheckCost = (securityChecks / 10000) * 0.0010; // $0.0010 per 10k checks
      const complianceCheckCost = (complianceChecks / 10000) * 0.0010; // $0.0010 per 10k checks
      const securityHubCost = (securityCheckCost + complianceCheckCost) * regionMultiplier * providerMultiplier;
      
      costs.serverless += securityHubCost;
      breakdown['security-hub'] = {
        securityChecks,
        complianceChecks,
        totalMonthlyCost: securityHubCost
      };
    }

    // ECR pricing (Container registry - relatively cheap)
    if (specs.services?.includes('ecr')) {
      const storageGB = specs.storageGB * 0.05; // 5% of total storage for container images
      const ecrCost = storageGB * 0.10 * regionMultiplier * providerMultiplier; // $0.10 per GB/month
      
      costs.storage += ecrCost;
      breakdown.ecr = {
        storageGB,
        ratePerGB: 0.10,
        totalMonthlyCost: ecrCost
      };
    }

    // App Runner pricing
    if (specs.services?.includes('app-runner')) {
      const activeHours = 24 * 30; // always running
      const provisionalHours = 0; // scaling down
      const requests = 1000000; // 1M requests per month
      
      const activeCost = activeHours * 0.007 * specs.cpuCores; // $0.007 per vCPU per hour
      const requestCost = (requests / 1000000) * 0.40; // $0.40 per million requests
      const appRunnerCost = (activeCost + requestCost) * regionMultiplier * providerMultiplier;
      
      costs.compute += appRunnerCost;
      breakdown['app-runner'] = {
        activeHours,
        requests,
        activeMonthlyCost: activeCost,
        requestMonthlyCost: requestCost,
        totalMonthlyCost: appRunnerCost
      };
    }

    // Copilot pricing (deployment tool - minimal cost)
    if (specs.services?.includes('copilot')) {
      const copilotCost = 5 * regionMultiplier * providerMultiplier; // minimal fixed cost for tooling
      costs.serverless += copilotCost;
      
      breakdown.copilot = {
        deploymentToolCost: 5,
        totalMonthlyCost: copilotCost
      };
    }

    // DMS pricing (Database migration)
    if (specs.services?.includes('dms')) {
      const replicationHours = 24 * 30; // continuous replication
      const instanceType = 'dms.t3.micro';
      const hourlyRate = 0.0200; // $0.020 per hour
      
      const dmsCost = replicationHours * hourlyRate * regionMultiplier * providerMultiplier;
      costs.database += dmsCost;
      
      breakdown.dms = {
        replicationHours,
        instanceType,
        hourlyRate,
        totalMonthlyCost: dmsCost
      };
    }

    // DataSync pricing
    if (specs.services?.includes('datasync')) {
      const dataTransferredGB = specs.storageGB * 0.2; // 20% of storage transferred
      const datasyncCost = dataTransferredGB * 0.0125 * regionMultiplier * providerMultiplier; // $0.0125 per GB
      
      costs.storage += datasyncCost;
      breakdown.datasync = {
        dataTransferredGB,
        ratePerGB: 0.0125,
        totalMonthlyCost: datasyncCost
      };
    }

    // Storage Gateway pricing
    if (specs.services?.includes('storage-gateway')) {
      const storageGB = specs.storageGB;
      const requests = 100000; // requests per month
      
      const storageCost = storageGB * 0.023; // $0.023 per GB/month
      const requestCost = (requests / 1000) * 0.01; // $0.01 per 1k requests
      const storageGatewayCost = (storageCost + requestCost) * regionMultiplier * providerMultiplier;
      
      costs.storage += storageGatewayCost;
      breakdown['storage-gateway'] = {
        storageGB,
        requests,
        storageMonthlyCost: storageCost,
        requestMonthlyCost: requestCost,
        totalMonthlyCost: storageGatewayCost
      };
    }

    // DocumentDB pricing (MongoDB compatible - expensive)
    if (specs.services?.includes('documentdb')) {
      const instanceType = specs.ramGB <= 8 ? 'db.t3.medium' : 'db.r5.large';
      const instanceHourlyCost = instanceType === 'db.t3.medium' ? 0.0928 : 0.277;
      const storageGB = specs.storageGB;
      const storageCost = storageGB * 0.10; // $0.10 per GB/month
      
      const documentdbCost = (instanceHourlyCost * 24 * 30 + storageCost) * regionMultiplier * providerMultiplier;
      costs.database += documentdbCost;
      
      breakdown.documentdb = {
        instanceType,
        instanceMonthlyCost: instanceHourlyCost * 24 * 30,
        storageMonthlyCost: storageCost,
        totalMonthlyCost: documentdbCost
      };
    }

    // Neptune pricing (Graph database - expensive)
    if (specs.services?.includes('neptune')) {
      const instanceType = specs.ramGB <= 8 ? 'db.t3.medium' : 'db.r5.large';
      const instanceHourlyCost = instanceType === 'db.t3.medium' ? 0.155 : 0.348;
      const storageGB = specs.storageGB;
      const storageCost = storageGB * 0.10; // $0.10 per GB/month
      
      const neptuneCost = (instanceHourlyCost * 24 * 30 + storageCost) * regionMultiplier * providerMultiplier;
      costs.database += neptuneCost;
      
      breakdown.neptune = {
        instanceType,
        instanceMonthlyCost: instanceHourlyCost * 24 * 30,
        storageMonthlyCost: storageCost,
        totalMonthlyCost: neptuneCost
      };
    }

    return { costs, breakdown };
  };

  // Generate pricing results for all providers
  const results: PricingResult[] = providers.map((provider, index) => {
    const { costs, breakdown } = calculateServiceCosts(provider, specs);
    
    const totalCost = costs.compute + costs.storage + costs.network + costs.database + costs.serverless;

    // Smart instance type recommendations
    const getInstanceType = (provider: CloudProvider, specs: ResourceSpecs) => {
      const family = specs.instanceFamily || 'general';
      const cores = specs.cpuCores;
      const ram = specs.ramGB;
      
      if (provider.id === 'aws') {
        if (family === 'general') {
          if (cores <= 1) return 't3.micro';
          if (cores <= 2) return 't3.small';
          if (cores <= 4) return 'm5.large';
          if (cores <= 8) return 'm5.xlarge';
          return 'm5.2xlarge';
        }
        if (family === 'compute') return `c5.${cores <= 2 ? 'large' : cores <= 4 ? 'xlarge' : '2xlarge'}`;
        if (family === 'memory') return `r5.${cores <= 2 ? 'large' : cores <= 4 ? 'xlarge' : '2xlarge'}`;
        if (family === 'gpu') return `p3.${cores <= 8 ? 'xlarge' : '2xlarge'}`;
      }
      
      if (provider.id === 'gcp') {
        if (family === 'general') return `n1-standard-${Math.min(cores, 8)}`;
        if (family === 'compute') return `c2-standard-${Math.min(cores, 8)}`;
        if (family === 'memory') return `n1-highmem-${Math.min(cores, 8)}`;
      }
      
      if (provider.id === 'azure') {
        if (family === 'general') return `D${cores}s_v3`;
        if (family === 'compute') return `F${cores}s_v2`;
        if (family === 'memory') return `E${cores}s_v3`;
      }
      
      return 'custom';
    };

    // Savings recommendations
    let savings = undefined;
    if (index === 1) { // GCP typically offers sustained use discounts
      savings = {
        percentSaved: 25,
        alternativeInstance: getInstanceType(provider, specs),
        reason: 'Sustained use discount + committed use',
        monthlySavings: totalCost * 0.25,
      };
    } else if (index === 0 && specs.services?.includes('ec2')) { // AWS reserved instances
      savings = {
        percentSaved: 30,
        alternativeInstance: 'Reserved Instance (1-year)',
        reason: '1-year Reserved Instance commitment',
        monthlySavings: totalCost * 0.30,
      };
    }

    return {
      provider,
      monthlycost: Math.round(totalCost * 100) / 100,
      instanceType: getInstanceType(provider, specs),
      region: specs.region,
      breakdown: {
        compute: Math.round(costs.compute * 100) / 100,
        storage: Math.round(costs.storage * 100) / 100,
        network: Math.round(costs.network * 100) / 100,
        database: Math.round(costs.database * 100) / 100,
        serverless: Math.round(costs.serverless * 100) / 100,
      },
      detailedBreakdown: breakdown,
      savings,
      specs: {
        services: specs.services,
        cpuCores: specs.cpuCores,
        ramGB: specs.ramGB,
        storageGB: specs.storageGB,
        region: specs.region,
        instanceFamily: specs.instanceFamily,
        operatingSystem: specs.operatingSystem
      }
    };
  });

  // Sort by cost (cheapest first)
  results.sort((a, b) => a.monthlycost - b.monthlycost);

  const response: ApiResponse = {
    success: true,
    data: results,
    message: `Cost analysis completed for ${specs.services?.length || 0} services`,
    timestamp: new Date(),
    requestId: req.requestId,
  };

  res.json(response);
}));

// Get pricing data endpoint
router.get('/pricing-data', asyncHandler(async (req: any, res: any) => {
  const { provider, region } = req.query;
  
  // TODO: Implement actual pricing data retrieval from cache
  const response: ApiResponse = {
    success: true,
    data: {
      provider: provider || 'all',
      region: region || 'all',
      lastUpdated: new Date(),
      instanceTypes: {
        // Mock instance type data
        't3.medium': {
          vcpu: 2,
          memory: 4,
          pricing: { onDemand: 0.0416 }
        },
        'm5.large': {
          vcpu: 2,
          memory: 8,
          pricing: { onDemand: 0.096 }
        }
      }
    },
    timestamp: new Date(),
    requestId: req.requestId,
  };

  res.json(response);
}));

// Save comparison endpoint
router.post('/save-comparison', asyncHandler(async (req: any, res: any) => {
  const comparisonData = req.body;
  
  // TODO: Implement actual comparison saving
  const response: ApiResponse = {
    success: true,
    data: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      ...comparisonData,
      createdAt: new Date(),
    },
    message: 'Comparison saved successfully',
    timestamp: new Date(),
    requestId: req.requestId,
  };

  res.status(201).json(response);
}));

export { router as costCalculationRouter };
