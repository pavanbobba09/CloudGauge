import React from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { PricingResult } from '../types'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface CostChartProps {
  results: PricingResult[]
}

// Bar chart component for visualizing cost comparisons
const CostChart: React.FC<CostChartProps> = ({ results }) => {
  // Prepare chart data
  const chartData = {
    labels: results.map(result => result.provider.name),
    datasets: [
      {
        label: 'Monthly Cost ($)',
        data: results.map(result => result.monthlycost),
        backgroundColor: results.map(result => {
          // Use provider-specific colors
          switch (result.provider.id) {
            case 'aws':
              return 'rgba(255, 153, 0, 0.8)' // Orange for AWS
            case 'gcp':
              return 'rgba(66, 133, 244, 0.8)' // Blue for GCP
            case 'azure':
              return 'rgba(0, 120, 212, 0.8)' // Blue for Azure
            default:
              return 'rgba(75, 192, 192, 0.8)'
          }
        }),
        borderColor: results.map(result => {
          switch (result.provider.id) {
            case 'aws':
              return 'rgba(255, 153, 0, 1)'
            case 'gcp':
              return 'rgba(66, 133, 244, 1)'
            case 'azure':
              return 'rgba(0, 120, 212, 1)'
            default:
              return 'rgba(75, 192, 192, 1)'
          }
        }),
        borderWidth: 2,
      },
    ],
  }

  // Chart configuration - learned these options from previous dashboard projects
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false, // We handle title outside the chart
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const result = results[context.dataIndex]
            return [
              `Cost: $${context.parsed.y.toFixed(2)}/month`,
              `Instance: ${result.instanceType}`,
              `Region: ${result.region}`
            ]
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toFixed(0)
          }
        }
      }
    },
    // Animation settings for a nice user experience
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart' as const,
    },
  }

  return (
    <div className="chart-container">
      <Bar data={chartData} options={options} />
    </div>
  )
}

export default CostChart
