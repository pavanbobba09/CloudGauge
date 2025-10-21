# Development Setup Guide

This guide will help you set up the Cloud Cost Optimizer application for local development.

## Prerequisites

- Node.js 18+ and npm 8+
- PostgreSQL 14+
- Redis 6+
- AWS CLI (for deployment)
- Terraform 1.0+ (for infrastructure)

## Quick Start

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd personal-cloud-cost-optimizer
   npm run install:all
   ```

2. **Set up Environment Variables**
   
   Copy the example environment files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   
   Edit `backend/.env` with your database and API credentials:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/cloud_optimizer
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your-super-secret-jwt-key-change-this
   # Add your cloud provider API keys here
   ```

3. **Set up Database**
   ```bash
   createdb cloud_optimizer
   npm run migrate
   ```

4. **Start Development Servers**
   ```bash
   npm run dev
   ```
   
   This starts:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## Project Structure

```
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service layer
│   │   ├── types/           # TypeScript definitions
│   │   └── styles/          # CSS and styling
│   └── package.json
├── backend/                  # Node.js Express backend
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── utils/           # Utility functions
│   │   └── types/           # TypeScript definitions
│   └── package.json
├── terraform/               # Infrastructure as Code
│   ├── main.tf             # Main Terraform configuration
│   ├── variables.tf        # Variable definitions
│   └── outputs.tf          # Output values
├── migrations/              # Database migration scripts
├── monitoring/              # Monitoring and alerting configs
└── .github/workflows/       # CI/CD pipeline
```

## Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both frontend and backend for production
- `npm test` - Run all tests
- `npm run install:all` - Install dependencies for all projects

### Frontend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm test` - Run React tests

### Backend
- `npm run dev` - Start with nodemon for auto-restart
- `npm run build` - Compile TypeScript to JavaScript
- `npm run migrate` - Run database migrations

## Key Features Implemented

### Frontend
- ✅ React 18 with TypeScript
- ✅ Tailwind CSS for styling
- ✅ Chart.js for data visualizations
- ✅ React Hook Form for form handling
- ✅ React Query for API state management
- ✅ Responsive design with mobile support

### Backend
- ✅ Express.js with TypeScript
- ✅ Raw SQL queries with PostgreSQL
- ✅ Redis caching for pricing data
- ✅ JWT authentication
- ✅ Request logging and error handling
- ✅ Input validation with Joi

### Infrastructure
- ✅ AWS Lambda serverless functions
- ✅ API Gateway for REST endpoints
- ✅ RDS PostgreSQL database
- ✅ ElastiCache Redis cluster
- ✅ CloudWatch monitoring and logging
- ✅ Terraform Infrastructure as Code

### DevOps
- ✅ GitHub Actions CI/CD pipeline
- ✅ Automated testing and deployment
- ✅ Environment-specific configurations
- ✅ Grafana monitoring dashboard

## Development Workflow

1. **Feature Development**
   - Create feature branch from main
   - Develop with hot reload using `npm run dev`
   - Write tests for new functionality
   - Test locally before pushing

2. **Testing**
   - Frontend: Jest + React Testing Library
   - Backend: Jest + Supertest
   - Run `npm test` before committing

3. **Database Changes**
   - Create new migration in `/migrations`
   - Test migration with `npm run migrate`
   - Include rollback instructions

4. **Deployment**
   - Push to main branch triggers CI/CD
   - Automated testing and building
   - Terraform applies infrastructure changes
   - Lambda functions updated automatically

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Cost Calculation
- `POST /api/calculate-costs` - Calculate costs for specifications
- `GET /api/pricing-data` - Get cached pricing data
- `POST /api/save-comparison` - Save cost comparison

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/comparisons` - Get saved comparisons

### Health Check
- `GET /api/health` - Service health status

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check PostgreSQL is running: `brew services start postgresql`
   - Verify DATABASE_URL in .env file
   - Ensure database exists: `createdb cloud_optimizer`

2. **Redis Connection Errors**
   - Check Redis is running: `brew services start redis`
   - Verify REDIS_URL in .env file

3. **Build Errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check Node.js version: `node --version` (should be 18+)

4. **API Errors**
   - Check backend logs in terminal
   - Verify environment variables are set
   - Test endpoints with curl or Postman

### Development Tips

1. **Hot Reload Issues**
   - Save files to trigger reload
   - Check console for errors
   - Restart dev server if needed

2. **Database Schema Changes**
   - Always create migrations for schema changes
   - Test migrations on clean database
   - Keep migrations idempotent

3. **Environment Variables**
   - Never commit .env files
   - Use .env.example as template
   - Restart servers after changing environment variables

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes following the coding style
4. Add tests for new functionality
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open Pull Request

## License

This project is licensed under the MIT License. See LICENSE file for details.
