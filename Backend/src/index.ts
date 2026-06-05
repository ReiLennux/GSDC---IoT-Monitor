import 'reflect-metadata';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createServer } from 'http';
import { DescribeTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './presentation/middleware/error-handler';
import { sanitizeInput } from './presentation/middleware/sanitize.middleware';
import routes from './presentation/routes';
import { initSocketServer } from './infrastructure/websocket/socket';
import { createSocketHandlers } from './presentation/socket-handlers';
import { logger } from './utils/logger';

async function checkDatabase() {
  try {
    const client = new DynamoDBClient({
      region: env.awsRegion,
      endpoint: env.dynamodbEndpoint,
      credentials: { accessKeyId: env.awsAccessKeyId, secretAccessKey: env.awsSecretAccessKey },
    });
    await client.send(new DescribeTableCommand({ TableName: env.dynamodbTableName }));
    logger.info(`DynamoDB table "${env.dynamodbTableName}" ready`);
  } catch (err: unknown) {
    const error = err as { name?: string };
    if (error.name === 'ResourceNotFoundException') {
      logger.warn(`DynamoDB table "${env.dynamodbTableName}" not found — run "npm run db:init"`);
    } else {
      logger.error(`DynamoDB check failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);

app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));
app.use(express.json());
app.use(sanitizeInput);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1', routes);

app.get('/api-docs-json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(errorHandler);

initSocketServer(httpServer, createSocketHandlers());

httpServer.listen(env.port, async () => {
  logger.info(`Server running on port ${env.port}`);
  await checkDatabase();
});

export default app;
