import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
    dynamodbEndpoint: process.env.NODE_ENV === 'production' ? process.env.DYNAMODB_ENDPOINT : (process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'),
  dynamodbTableName: process.env.DYNAMODB_TABLE_NAME || 'IoT_Monitor_Table',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  iotApiKey: process.env.IOT_API_KEY || '',

};
