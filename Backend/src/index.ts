import 'reflect-metadata';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createServer } from 'http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './presentation/middleware/error-handler';
import routes from './presentation/routes';
import { initSocketServer } from './infrastructure/websocket/socket';
import { logger } from './utils/logger';

const app = express();
const httpServer = createServer(app);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1', routes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(errorHandler);

initSocketServer(httpServer);

httpServer.listen(env.port, () => {
  logger.info(`Server running on port ${env.port}`);
});

export default app;
