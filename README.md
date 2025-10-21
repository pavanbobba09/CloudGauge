# Personal Cloud Cost Optimizer

## About the Project

Cloud infrastructure costs can quickly spiral out of control if not monitored properly. I built this application to help developers and organizations estimate and compare costs across different cloud providers before making infrastructure decisions. Instead of manually checking pricing pages or using complex calculators, this tool provides a straightforward way to calculate costs for over 40 AWS services and compare them in one place.

The motivation behind this project was to create a practical tool that I could use in my own work while learning full-stack development with modern technologies. It demonstrates how to build a production-ready web application with proper architecture, authentication, and deployment strategies.

## Screenshots

### Service Selection
![Service Selection](screenshots/services.png)

### Configuration and Cost Results
![Configuration](screenshots/configration.png)

## Technologies Used

This project uses a modern full-stack JavaScript architecture with the following technologies:

**Frontend**
- React with TypeScript for type safety and component-based UI
- Vite as the build tool for faster development
- Tailwind CSS for utility-first styling
- Axios for API communication

**Backend**
- Node.js with Express for the REST API
- TypeScript for type safety across the codebase
- PostgreSQL for storing user data and cost comparisons
- Redis for caching pricing data to improve performance
- JWT for secure authentication

**Infrastructure and Deployment**
- AWS Lambda for serverless compute
- Terraform for infrastructure as code
- GitHub Actions for CI/CD pipeline
- CloudWatch for monitoring and logging

## Features

The application allows you to select from over 40 AWS services including EC2, Lambda, RDS, S3, and many others. You can configure specifications like instance types, storage amounts, and region, then get instant cost estimates. The tool calculates monthly costs and provides a breakdown for each service you configure.

Currently, the backend provides mock pricing data for demonstration purposes, but it is architected to easily integrate real-time pricing APIs from AWS, GCP, and Azure in the future.

## Getting Started

### Prerequisites

Before running this project, you need to have the following installed on your system:

- Node.js version 18 or higher
- npm version 8 or higher
- PostgreSQL version 14 or higher
- Redis version 6 or higher

### Installation and Setup

1. Clone this repository to your local machine:

```bash
git clone <repository-url>
cd personal-cloud-cost-optimizer
```

2. Install all dependencies for both frontend and backend:

```bash
npm run install:all
```

3. Set up your PostgreSQL database:

```bash
createdb cloud_optimizer
```

4. Run database migrations to create the necessary tables:

```bash
npm run migrate
```

5. Configure environment variables by creating a `.env` file in the backend directory:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/cloud_optimizer
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here
PORT=3002
NODE_ENV=development
```

6. Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:3002/api
```

### Running the Application

Start both the frontend and backend servers:

```bash
npm run dev
```

The frontend will be available at http://localhost:3000 and the backend API at http://localhost:3002.

## Project Structure

The project is organized as a monorepo with separate frontend and backend directories:

```
personal-cloud-cost-optimizer/
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   └── types/         # TypeScript type definitions
│   └── package.json
│
├── backend/               # Express backend API
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── middleware/   # Express middleware
│   │   ├── types/        # TypeScript interfaces
│   │   └── utils/        # Utility functions
│   └── package.json
│
├── migrations/           # Database migration scripts
└── terraform/           # Infrastructure as code
```

## API Endpoints

The backend exposes the following REST API endpoints:

**Cost Calculation**
- POST `/api/cost/calculate` - Calculate costs for selected services and configurations

**Authentication** (for future implementation)
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Authenticate and receive JWT token

**Health Check**
- GET `/api/health` - Check if the API is running

## Future Enhancements

There are several improvements I plan to add to this project:

- Integration with actual AWS, GCP, and Azure pricing APIs for real-time cost data
- User authentication and the ability to save cost comparisons
- Historical cost tracking and trend analysis
- Email alerts for cost threshold notifications
- Support for more complex infrastructure scenarios
- Cost optimization recommendations based on usage patterns

## What I Learned

Building this project helped me understand several important concepts:

- Structuring a full-stack TypeScript application with proper type safety
- Implementing REST APIs with Express and handling CORS properly
- Working with PostgreSQL and writing raw SQL queries
- Using Redis for caching to improve application performance
- Building responsive UIs with React and Tailwind CSS
- Setting up CI/CD pipelines with GitHub Actions
- Infrastructure as code principles with Terraform

## License

This project is open source and available under the MIT License.
