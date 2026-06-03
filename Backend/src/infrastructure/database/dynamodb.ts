import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { env } from '../../config/env';

const client = new DynamoDBClient({
  region: env.awsRegion,
  endpoint: env.dynamodbEndpoint,
  credentials: {
    accessKeyId: env.awsAccessKeyId,
    secretAccessKey: env.awsSecretAccessKey,
  },
});

export const docClient = DynamoDBDocumentClient.from(client);
