import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import app from './index';
import { logger } from './utils/logger';

// Lambda handler that wraps our Express app
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // Log the incoming event
    logger.info('Lambda invocation started', {
      requestId: context.awsRequestId,
      httpMethod: event.httpMethod,
      path: event.path,
      userAgent: event.headers['User-Agent'],
      sourceIp: event.requestContext.identity.sourceIp,
    });

    // Convert API Gateway event to Express-compatible request
    const response = await new Promise<APIGatewayProxyResult>((resolve, reject) => {
      // Create a mock request object
      const req = {
        method: event.httpMethod,
        url: event.path + (event.queryStringParameters ? 
          '?' + new URLSearchParams(event.queryStringParameters).toString() : ''),
        headers: event.headers,
        body: event.body,
        // Add Lambda-specific properties
        requestId: context.awsRequestId,
        startTime: Date.now(),
      };

      // Create a mock response object
      const res = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        body: '',
        // Mock Express response methods
        status: function(code: number) {
          this.statusCode = code;
          return this;
        },
        json: function(data: any) {
          this.body = JSON.stringify(data);
          resolve({
            statusCode: this.statusCode,
            headers: this.headers,
            body: this.body,
          });
          return this;
        },
        send: function(data: any) {
          this.body = typeof data === 'string' ? data : JSON.stringify(data);
          resolve({
            statusCode: this.statusCode,
            headers: this.headers,
            body: this.body,
          });
          return this;
        },
        set: function(key: string, value: string) {
          this.headers[key] = value;
          return this;
        },
        get: function(key: string) {
          return req.headers[key.toLowerCase()];
        },
      };

      // Handle the request using our Express app
      // This is a simplified approach - in production, use serverless-express or similar
      try {
        // Route the request based on path and method
        if (event.httpMethod === 'GET' && event.path === '/api/health') {
          res.json({
            success: true,
            data: {
              status: 'healthy',
              timestamp: new Date(),
              environment: process.env.NODE_ENV,
            },
          });
        } else if (event.httpMethod === 'POST' && event.path === '/api/calculate-costs') {
          // Mock cost calculation response
          res.json({
            success: true,
            data: [
              {
                provider: { id: 'aws', name: 'Amazon Web Services', logo: '', color: '#FF9900' },
                monthlycost: 125.50,
                instanceType: 'm5.large',
                region: 'us-east-1',
                breakdown: { compute: 100, storage: 20, network: 5.50 },
              }
            ],
            timestamp: new Date(),
            requestId: context.awsRequestId,
          });
        } else if (event.httpMethod === 'POST' && event.path === '/api/auth/login') {
          // Mock login response
          res.json({
            success: true,
            data: {
              user: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'demo@cloudoptimizer.com',
                firstName: 'Demo',
                lastName: 'User',
                createdAt: new Date(),
              },
              token: 'mock-jwt-token',
            },
            timestamp: new Date(),
            requestId: context.awsRequestId,
          });
        } else {
          // 404 for unhandled routes
          res.status(404).json({
            success: false,
            error: 'Endpoint not found',
            path: event.path,
            timestamp: new Date(),
            requestId: context.awsRequestId,
          });
        }
      } catch (error) {
        logger.error('Request handling error', error as Error, {
          requestId: context.awsRequestId,
          path: event.path,
          method: event.httpMethod,
        });

        res.status(500).json({
          success: false,
          error: 'Internal server error',
          timestamp: new Date(),
          requestId: context.awsRequestId,
        });
      }
    });

    // Log the response
    logger.info('Lambda invocation completed', {
      requestId: context.awsRequestId,
      statusCode: response.statusCode,
      duration: Date.now() - context.getRemainingTimeInMillis(),
    });

    return response;

  } catch (error) {
    logger.error('Lambda handler error', error as Error, {
      requestId: context.awsRequestId,
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        timestamp: new Date(),
        requestId: context.awsRequestId,
      }),
    };
  }
};
