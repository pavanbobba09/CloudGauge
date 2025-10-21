import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ResourceSpecs, FormErrors, ServiceType } from '../types';

interface ResourceFormProps {
  onSubmit: (specs: ResourceSpecs) => void
}

const ResourceForm: React.FC<ResourceFormProps> = ({ onSubmit }) => {
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ResourceSpecs>({
    defaultValues: {
      services: ['ec2'],
      cpuCores: 2,
      ramGB: 8,
      storageGB: 100,
      region: 'us-east-1',
      operatingSystem: 'linux',
      instanceFamily: 'general'
    }
  })
  
  const [customErrors, setCustomErrors] = useState<FormErrors>({})
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>(['ec2'])
  const [activeTab, setActiveTab] = useState<'services' | 'configuration'>('services')

  // Available AWS services organized by cost impact and category
  const serviceCategories = [
    {
      name: 'Compute Services',
      services: [
        { id: 'ec2' as ServiceType, name: 'EC2 Instances', description: 'Virtual servers - highest cost', icon: '🖥️', costLevel: 'high', color: 'border-red-300 bg-red-50 text-red-800' },
        { id: 'lambda' as ServiceType, name: 'Lambda Functions', description: 'Serverless compute', icon: '⚡', costLevel: 'medium', color: 'border-yellow-300 bg-yellow-50 text-yellow-800' },
        { id: 'ecs' as ServiceType, name: 'ECS Containers', description: 'Containerized apps', icon: '📦', costLevel: 'high', color: 'border-blue-300 bg-blue-50 text-blue-800' },
        { id: 'eks' as ServiceType, name: 'EKS Kubernetes', description: 'Managed K8s - expensive', icon: '☸️', costLevel: 'high', color: 'border-purple-300 bg-purple-50 text-purple-800' },
        { id: 'fargate' as ServiceType, name: 'Fargate', description: 'Serverless containers', icon: '🚀', costLevel: 'high', color: 'border-red-300 bg-red-50 text-red-800' },
        { id: 'batch' as ServiceType, name: 'AWS Batch', description: 'Batch processing', icon: '🔄', costLevel: 'medium', color: 'border-indigo-300 bg-indigo-50 text-indigo-800' },
        { id: 'lightsail' as ServiceType, name: 'Lightsail VPS', description: 'Simple servers', icon: '💡', costLevel: 'low', color: 'border-green-300 bg-green-50 text-green-800' }
      ]
    },
    {
      name: 'Storage Services',
      services: [
        { id: 's3' as ServiceType, name: 'S3 Storage', description: 'Object storage', icon: '🪣', costLevel: 'medium', color: 'border-green-300 bg-green-50 text-green-800' },
        { id: 'ebs' as ServiceType, name: 'EBS Volumes', description: 'Block storage', icon: '💿', costLevel: 'high', color: 'border-orange-300 bg-orange-50 text-orange-800' },
        { id: 'efs' as ServiceType, name: 'EFS File System', description: 'Managed NFS', icon: '📁', costLevel: 'medium', color: 'border-blue-300 bg-blue-50 text-blue-800' },
        { id: 'fsx' as ServiceType, name: 'FSx File Systems', description: 'High-performance FS', icon: '🗂️', costLevel: 'high', color: 'border-purple-300 bg-purple-50 text-purple-800' },
        { id: 'glacier' as ServiceType, name: 'Glacier Archive', description: 'Cold storage', icon: '🧊', costLevel: 'low', color: 'border-cyan-300 bg-cyan-50 text-cyan-800' },
        { id: 'snowball' as ServiceType, name: 'Snowball', description: 'Data transfer device', icon: '📫', costLevel: 'medium', color: 'border-slate-300 bg-slate-50 text-slate-800' },
        { id: 'backup' as ServiceType, name: 'AWS Backup', description: 'Centralized backup', icon: '💾', costLevel: 'medium', color: 'border-green-300 bg-green-50 text-green-800' }
      ]
    },
    {
      name: 'Database Services',
      services: [
        { id: 'rds' as ServiceType, name: 'RDS Database', description: 'Managed DB - expensive', icon: '🗄️', costLevel: 'high', color: 'border-red-300 bg-red-50 text-red-800' },
        { id: 'dynamodb' as ServiceType, name: 'DynamoDB', description: 'NoSQL database', icon: '⚡', costLevel: 'medium', color: 'border-yellow-300 bg-yellow-50 text-yellow-800' },
        { id: 'redshift' as ServiceType, name: 'Redshift', description: 'Data warehouse - very expensive', icon: '🏭', costLevel: 'high', color: 'border-red-400 bg-red-100 text-red-900' },
        { id: 'elasticache' as ServiceType, name: 'ElastiCache', description: 'In-memory cache', icon: '🚀', costLevel: 'medium', color: 'border-orange-300 bg-orange-50 text-orange-800' },
        { id: 'documentdb' as ServiceType, name: 'DocumentDB', description: 'MongoDB compatible', icon: '📄', costLevel: 'high', color: 'border-green-400 bg-green-100 text-green-900' },
        { id: 'neptune' as ServiceType, name: 'Neptune', description: 'Graph database', icon: '🕸️', costLevel: 'high', color: 'border-purple-400 bg-purple-100 text-purple-900' },
        { id: 'timestream' as ServiceType, name: 'Timestream', description: 'Time-series DB', icon: '⏰', costLevel: 'high', color: 'border-blue-400 bg-blue-100 text-blue-900' }
      ]
    },
    {
      name: 'Network & CDN',
      services: [
        { id: 'cloudfront' as ServiceType, name: 'CloudFront', description: 'CDN', icon: '🌐', costLevel: 'medium', color: 'border-blue-300 bg-blue-50 text-blue-800' },
        { id: 'elb' as ServiceType, name: 'Load Balancer', description: 'Traffic distribution', icon: '⚖️', costLevel: 'medium', color: 'border-indigo-300 bg-indigo-50 text-indigo-800' },
        { id: 'vpc' as ServiceType, name: 'VPC', description: 'Virtual network', icon: '🔒', costLevel: 'low', color: 'border-green-300 bg-green-50 text-green-800' },
        { id: 'directconnect' as ServiceType, name: 'Direct Connect', description: 'Dedicated connection', icon: '🔗', costLevel: 'high', color: 'border-red-300 bg-red-50 text-red-800' },
        { id: 'apigateway' as ServiceType, name: 'API Gateway', description: 'API management', icon: '🚪', costLevel: 'medium', color: 'border-teal-300 bg-teal-50 text-teal-800' },
        { id: 'route53' as ServiceType, name: 'Route 53', description: 'DNS service', icon: '🛣️', costLevel: 'low', color: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
        { id: 'transit-gateway' as ServiceType, name: 'Transit Gateway', description: 'Network hub - expensive', icon: '🌐', costLevel: 'high', color: 'border-red-300 bg-red-50 text-red-800' }
      ]
    },
    {
      name: 'Analytics & Big Data',
      services: [
        { id: 'emr' as ServiceType, name: 'EMR', description: 'Big data - expensive', icon: '🏔️', costLevel: 'high', color: 'border-red-300 bg-red-50 text-red-800' },
        { id: 'glue' as ServiceType, name: 'Glue ETL', description: 'Data processing', icon: '🔧', costLevel: 'medium', color: 'border-blue-300 bg-blue-50 text-blue-800' },
        { id: 'kinesis' as ServiceType, name: 'Kinesis', description: 'Real-time streaming', icon: '🌊', costLevel: 'medium', color: 'border-cyan-300 bg-cyan-50 text-cyan-800' },
        { id: 'opensearch' as ServiceType, name: 'OpenSearch', description: 'Search engine', icon: '🔍', costLevel: 'high', color: 'border-yellow-400 bg-yellow-100 text-yellow-900' },
        { id: 'athena' as ServiceType, name: 'Athena', description: 'Serverless queries', icon: '🏛️', costLevel: 'medium', color: 'border-purple-300 bg-purple-50 text-purple-800' },
        { id: 'quicksight' as ServiceType, name: 'QuickSight', description: 'Business intelligence', icon: '📈', costLevel: 'medium', color: 'border-pink-300 bg-pink-50 text-pink-800' },
        { id: 'msk' as ServiceType, name: 'MSK (Kafka)', description: 'Managed streaming', icon: '📡', costLevel: 'high', color: 'border-orange-400 bg-orange-100 text-orange-900' },
        { id: 'databrew' as ServiceType, name: 'DataBrew', description: 'Visual data prep', icon: '🧪', costLevel: 'medium', color: 'border-green-300 bg-green-50 text-green-800' }
      ]
    },
    {
      name: 'AI/ML Services',
      services: [
        { id: 'sagemaker' as ServiceType, name: 'SageMaker', description: 'ML platform - very expensive', icon: '🤖', costLevel: 'high', color: 'border-red-400 bg-red-100 text-red-900' },
        { id: 'bedrock' as ServiceType, name: 'Bedrock', description: 'Generative AI', icon: '🎯', costLevel: 'high', color: 'border-purple-400 bg-purple-100 text-purple-900' },
        { id: 'rekognition' as ServiceType, name: 'Rekognition', description: 'Image/video analysis', icon: '👁️', costLevel: 'medium', color: 'border-blue-300 bg-blue-50 text-blue-800' },
        { id: 'comprehend' as ServiceType, name: 'Comprehend', description: 'Text analytics', icon: '📖', costLevel: 'medium', color: 'border-green-300 bg-green-50 text-green-800' },
        { id: 'textract' as ServiceType, name: 'Textract', description: 'Document extraction', icon: '📄', costLevel: 'medium', color: 'border-yellow-300 bg-yellow-50 text-yellow-800' }
      ]
    },
    {
      name: 'Enterprise & Productivity',
      services: [
        { id: 'workspaces' as ServiceType, name: 'WorkSpaces', description: 'Virtual desktops - expensive', icon: '🖥️', costLevel: 'high', color: 'border-red-300 bg-red-50 text-red-800' },
        { id: 'appstream' as ServiceType, name: 'AppStream', description: 'App streaming', icon: '📱', costLevel: 'high', color: 'border-orange-400 bg-orange-100 text-orange-900' },
        { id: 'connect' as ServiceType, name: 'Connect', description: 'Contact center', icon: '☎️', costLevel: 'high', color: 'border-blue-400 bg-blue-100 text-blue-900' },
        { id: 'chime' as ServiceType, name: 'Chime', description: 'Communications', icon: '💬', costLevel: 'medium', color: 'border-green-300 bg-green-50 text-green-800' }
      ]
    },
    {
      name: 'Security & Compliance',
      services: [
        { id: 'guardduty' as ServiceType, name: 'GuardDuty', description: 'Threat detection', icon: '🛡️', costLevel: 'medium', color: 'border-red-300 bg-red-50 text-red-800' },
        { id: 'inspector' as ServiceType, name: 'Inspector', description: 'Security assessment', icon: '🔍', costLevel: 'medium', color: 'border-orange-300 bg-orange-50 text-orange-800' },
        { id: 'macie' as ServiceType, name: 'Macie', description: 'Data security', icon: '🔐', costLevel: 'medium', color: 'border-purple-300 bg-purple-50 text-purple-800' },
        { id: 'security-hub' as ServiceType, name: 'Security Hub', description: 'Security posture', icon: '🏛️', costLevel: 'medium', color: 'border-blue-300 bg-blue-50 text-blue-800' }
      ]
    },
    {
      name: 'Container & Orchestration',
      services: [
        { id: 'ecr' as ServiceType, name: 'ECR', description: 'Container registry', icon: '📦', costLevel: 'low', color: 'border-green-300 bg-green-50 text-green-800' },
        { id: 'app-runner' as ServiceType, name: 'App Runner', description: 'Container apps', icon: '🏃', costLevel: 'medium', color: 'border-blue-300 bg-blue-50 text-blue-800' },
        { id: 'copilot' as ServiceType, name: 'Copilot', description: 'Container deployment', icon: '✈️', costLevel: 'low', color: 'border-cyan-300 bg-cyan-50 text-cyan-800' }
      ]
    },
    {
      name: 'Migration & Hybrid',
      services: [
        { id: 'dms' as ServiceType, name: 'DMS', description: 'Database migration', icon: '🔄', costLevel: 'medium', color: 'border-indigo-300 bg-indigo-50 text-indigo-800' },
        { id: 'datasync' as ServiceType, name: 'DataSync', description: 'Data transfer', icon: '🔄', costLevel: 'medium', color: 'border-teal-300 bg-teal-50 text-teal-800' },
        { id: 'storage-gateway' as ServiceType, name: 'Storage Gateway', description: 'Hybrid storage', icon: '🌉', costLevel: 'medium', color: 'border-purple-300 bg-purple-50 text-purple-800' }
      ]
    }
  ]

  const getCostLevelBadge = (level: string) => {
    switch (level) {
      case 'high': return { text: '💸 High Cost', class: 'bg-red-100 text-red-800 border-red-300' }
      case 'medium': return { text: '💰 Medium', class: 'bg-yellow-100 text-yellow-800 border-yellow-300' }
      case 'low': return { text: '💚 Low Cost', class: 'bg-green-100 text-green-800 border-green-300' }
      default: return { text: '💙 Variable', class: 'bg-blue-100 text-blue-800 border-blue-300' }
    }
  }

  const toggleService = (serviceId: ServiceType) => {
    const updatedServices = selectedServices.includes(serviceId)
      ? selectedServices.filter(s => s !== serviceId)
      : [...selectedServices, serviceId]
    
    setSelectedServices(updatedServices)
    setValue('services', updatedServices)
  }

  const handleFormSubmit = (data: ResourceSpecs) => {
    setCustomErrors({})
    onSubmit({ ...data, services: selectedServices })
  }

  const handleReset = () => {
    reset()
    setCustomErrors({})
    setSelectedServices(['ec2'])
    setActiveTab('services')
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-8 shadow-lg border border-slate-200">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Configure Your Cloud Infrastructure
        </h2>
        <p className="text-slate-600 mt-2">
          Select services to analyze costs across AWS, GCP, and Azure
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex mb-6 bg-white rounded-xl p-1 shadow-sm border">
        <button
          type="button"
          onClick={() => setActiveTab('services')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'services'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🏗️ Select Services ({selectedServices.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('configuration')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'configuration'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          ⚙️ Configuration
        </button>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Service Selection Guide</h3>
              <p className="text-blue-800 text-sm">
                Select multiple services to get comprehensive cost comparisons. Services with 
                <span className="mx-1 px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs">💸 High Cost</span>
                badges are major cost drivers worth optimizing.
              </p>
            </div>

            {serviceCategories.map((category) => (
              <div key={category.name} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                  {category.name}
                  <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                    {category.services.length} services
                  </span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {category.services.map((service) => {
                    const isSelected = selectedServices.includes(service.id)
                    const badge = getCostLevelBadge(service.costLevel)
                    
                    return (
                      <div
                        key={service.id}
                        onClick={() => toggleService(service.id)}
                        className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                          isSelected
                            ? `${service.color} ring-2 ring-blue-300 shadow-md transform scale-[1.02]`
                            : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xl">{service.icon}</span>
                            <span className="font-medium text-slate-900">{service.name}</span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-slate-600 mb-3">{service.description}</p>
                        
                        <div className="flex justify-end">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${badge.class}`}>
                            {badge.text}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {selectedServices.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  ⚠️ Please select at least one service to analyze costs.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'configuration' && (
          <div className="space-y-6">
            {/* Compute Configuration */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">🖥️ Compute Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    CPU Cores
                  </label>
                  <select 
                    {...register('cpuCores', { required: 'CPU cores is required' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>1 Core</option>
                    <option value={2}>2 Cores</option>
                    <option value={4}>4 Cores</option>
                    <option value={8}>8 Cores</option>
                    <option value={16}>16 Cores</option>
                    <option value={32}>32 Cores</option>
                  </select>
                  {errors.cpuCores && <p className="text-red-500 text-sm mt-1">{errors.cpuCores.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    RAM (GB)
                  </label>
                  <select 
                    {...register('ramGB', { required: 'RAM is required' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={4}>4 GB</option>
                    <option value={8}>8 GB</option>
                    <option value={16}>16 GB</option>
                    <option value={32}>32 GB</option>
                    <option value={64}>64 GB</option>
                    <option value={128}>128 GB</option>
                  </select>
                  {errors.ramGB && <p className="text-red-500 text-sm mt-1">{errors.ramGB.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Instance Family
                  </label>
                  <select 
                    {...register('instanceFamily')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="general">General Purpose</option>
                    <option value="compute">Compute Optimized</option>
                    <option value="memory">Memory Optimized</option>
                    <option value="storage">Storage Optimized</option>
                    <option value="gpu">GPU Instances</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Operating System
                  </label>
                  <select 
                    {...register('operatingSystem', { required: 'Operating system is required' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="linux">Linux</option>
                    <option value="windows">Windows</option>
                  </select>
                  {errors.operatingSystem && <p className="text-red-500 text-sm mt-1">{errors.operatingSystem.message}</p>}
                </div>
              </div>
            </div>

            {/* Storage Configuration */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">💾 Storage Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Storage Size (GB)
                  </label>
                  <select 
                    {...register('storageGB', { required: 'Storage size is required' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={50}>50 GB</option>
                    <option value={100}>100 GB</option>
                    <option value={500}>500 GB</option>
                    <option value={1000}>1 TB</option>
                    <option value={5000}>5 TB</option>
                    <option value={10000}>10 TB</option>
                  </select>
                  {errors.storageGB && <p className="text-red-500 text-sm mt-1">{errors.storageGB.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Storage Type
                  </label>
                  <select 
                    {...register('storageType', { required: 'Storage type is required' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="s3-standard">S3 Standard</option>
                    <option value="s3-ia">S3 Infrequent Access</option>
                    <option value="s3-glacier">S3 Glacier</option>
                    <option value="ebs-gp3">EBS GP3 (SSD)</option>
                    <option value="ebs-io2">EBS IO2 (High IOPS)</option>
                  </select>
                  {errors.storageType && <p className="text-red-500 text-sm mt-1">{errors.storageType.message}</p>}
                </div>
              </div>
            </div>

            {/* Region & Advanced */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">🌍 Region & Advanced Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    AWS Region
                  </label>
                  <select 
                    {...register('region', { required: 'Region is required' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="us-east-1">US East (N. Virginia)</option>
                    <option value="us-west-2">US West (Oregon)</option>
                    <option value="eu-west-1">EU (Ireland)</option>
                    <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                    <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                  </select>
                  {errors.region && <p className="text-red-500 text-sm mt-1">{errors.region.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Usage Duration
                  </label>
                  <select 
                    {...register('usageDuration', { required: 'Usage duration is required' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  {errors.usageDuration && <p className="text-red-500 text-sm mt-1">{errors.usageDuration.message}</p>}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register('gpuRequired')}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">GPU Required (High Performance Computing)</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register('highAvailability')}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">High Availability (Multi-AZ)</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register('backupRequired')}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Automated Backups Required</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200">
          <button
            type="submit"
            disabled={selectedServices.length === 0}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            🚀 Compare Cloud Costs
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            className="sm:w-auto px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200"
          >
            🔄 Reset Form
          </button>
        </div>

        {/* Selected Services Summary */}
        {selectedServices.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Selected Services ({selectedServices.length})</h4>
            <div className="flex flex-wrap gap-2">
              {selectedServices.map((serviceId) => {
                const service = serviceCategories
                  .flatMap(cat => cat.services)
                  .find(s => s.id === serviceId)
                
                return service ? (
                  <span key={serviceId} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {service.icon} {service.name}
                  </span>
                ) : null
              })}
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

export default ResourceForm
