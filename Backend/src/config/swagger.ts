import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'IoT Monitor API',
    version: '1.0.0',
    description: 'Real-time IoT device monitoring platform API',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local development' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              status: { type: 'integer' },
              message: { type: 'string' },
            },
          },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          role: { type: 'string', enum: ['admin', 'operator', 'viewer'] },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
        },
      },
      Device: {
        type: 'object',
        properties: {
          PK: { type: 'string' },
          SK: { type: 'string' },
          deviceId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['temperature', 'humidity', 'power', 'ups', 'cooling'] },
          location: {
            type: 'object',
            properties: {
              rack: { type: 'string' },
              position: { type: 'string' },
              floor: { type: 'integer' },
            },
          },
          status: { type: 'string', enum: ['online', 'offline', 'maintenance', 'critical'] },
          thresholds: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
              criticalMin: { type: 'number' },
              criticalMax: { type: 'number' },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateDeviceInput: {
        type: 'object',
        required: ['name', 'type', 'location'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['temperature', 'humidity', 'power', 'ups', 'cooling'] },
          location: {
            type: 'object',
            required: ['rack', 'position', 'floor'],
            properties: {
              rack: { type: 'string' },
              position: { type: 'string' },
              floor: { type: 'integer' },
            },
          },
          thresholds: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
              criticalMin: { type: 'number' },
              criticalMax: { type: 'number' },
            },
          },
          metadata: {
            type: 'object',
            properties: {
              manufacturer: { type: 'string' },
              model: { type: 'string' },
              firmwareVersion: { type: 'string' },
            },
          },
        },
      },
      Reading: {
        type: 'object',
        properties: {
          PK: { type: 'string' },
          SK: { type: 'string' },
          deviceId: { type: 'string' },
          value: { type: 'number' },
          unit: { type: 'string' },
          quality: { type: 'string', enum: ['good', 'uncertain', 'bad'] },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      BatchReadingInput: {
        type: 'object',
        required: ['readings'],
        properties: {
          readings: {
            type: 'array',
            items: {
              type: 'object',
              required: ['deviceId', 'value', 'unit'],
              properties: {
                deviceId: { type: 'string' },
                value: { type: 'number' },
                unit: { type: 'string' },
                quality: { type: 'string', enum: ['good', 'uncertain', 'bad'] },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      Alert: {
        type: 'object',
        properties: {
          PK: { type: 'string' },
          SK: { type: 'string' },
          GSI1PK: { type: 'string' },
          alertId: { type: 'string' },
          deviceId: { type: 'string' },
          severity: { type: 'string', enum: ['info', 'warning', 'critical', 'emergency'] },
          type: { type: 'string', enum: ['threshold_exceeded', 'device_offline', 'anomaly_detected'] },
          message: { type: 'string' },
          acknowledged: { type: 'boolean' },
          resolvedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      DashboardOverview: {
        type: 'object',
        properties: {
          totalDevices: { type: 'integer' },
          onlineDevices: { type: 'integer' },
          criticalDevices: { type: 'integer' },
          activeAlerts: { type: 'integer' },
          recentAlerts: { type: 'array', items: { $ref: '#/components/schemas/Alert' } },
        },
      },
    },
  },
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: ['./src/presentation/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
