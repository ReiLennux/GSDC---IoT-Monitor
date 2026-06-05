import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  UpdateTableCommand,
  UpdateTimeToLiveCommand,
  BillingMode,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import { UserRole } from '../domain/enums';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'IoT_Monitor_Table';
const ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
const REGION = process.env.AWS_REGION || 'us-east-1';

const client = new DynamoDBClient({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});

const docClient = DynamoDBDocumentClient.from(client);

async function tableExists(): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    return true;
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'ResourceNotFoundException') return false;
    throw err;
  }
}

async function createTable(): Promise<void> {
  console.log(`Creating table ${TABLE_NAME}...`);

  await client.send(new CreateTableCommand({
    TableName: TABLE_NAME,
    BillingMode: BillingMode.PAY_PER_REQUEST,
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'GSI1PK', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'GSI1',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  }));

  console.log('Table created successfully');

  await client.send(new UpdateTimeToLiveCommand({
    TableName: TABLE_NAME,
    TimeToLiveSpecification: {
      AttributeName: 'TTL',
      Enabled: true,
    },
  }));

  console.log('TTL enabled on attribute "TTL"');
}

async function ensureGSI(): Promise<void> {
  const desc = await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
  const table = desc.Table;
  if (!table) throw new Error('Table not found');
  const hasGSI1 = table.GlobalSecondaryIndexes?.some((i) => i.IndexName === 'GSI1');
  if (hasGSI1) {
    console.log('GSI1 already exists');
    return;
  }
  console.log('Adding GSI1...');
  await client.send(new UpdateTableCommand({
    TableName: TABLE_NAME,
    AttributeDefinitions: [
      { AttributeName: 'GSI1PK', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexUpdates: [
      {
        Create: {
          IndexName: 'GSI1',
          KeySchema: [
            { AttributeName: 'GSI1PK', KeyType: 'HASH' },
            { AttributeName: 'SK', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
      },
    ],
  }));
  console.log('GSI1 added, waiting for it to become active...');
  let active = false;
  while (!active) {
    await new Promise((r) => setTimeout(r, 1000));
    const d = await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    if (!d.Table) continue;
    active = d.Table.GlobalSecondaryIndexes?.some((i) => i.IndexName === 'GSI1' && i.IndexStatus === 'ACTIVE') ?? false;
  }
  console.log('GSI1 is active');
}

async function migrateDevices(): Promise<void> {
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk AND attribute_not_exists(GSI1PK)',
    ExpressionAttributeValues: {
      ':prefix': 'DEVICE#',
      ':sk': 'METADATA',
    },
  }));
  const items = result.Items || [];
  if (items.length === 0) {
    console.log('No devices to migrate');
    return;
  }
  for (const item of items) {
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: item.PK, SK: item.SK },
      UpdateExpression: 'SET GSI1PK = :val',
      ExpressionAttributeValues: { ':val': 'DEVICE' },
    }));
  }
  console.log(`Migrated ${items.length} devices (added GSI1PK)`);
}

async function seedAdmin(): Promise<void> {
  console.log('Seeding admin user...');

  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const userId = uuid();

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `USER#${userId}`,
      SK: 'METADATA',
      GSI1PK: 'EMAIL#admin@iot.local',
      userId,
      email: 'admin@iot.local',
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  }));

  console.log('Admin user seeded: admin@iot.local / Admin123!');
}

async function main() {
  const exists = await tableExists();

  if (exists) {
    console.log(`Table ${TABLE_NAME} already exists`);
    await ensureGSI();
  } else {
    await createTable();
  }

  await migrateDevices();
  await seedAdmin();
  console.log('Done');
}

main().catch((err) => {
  console.error('Init failed:', err);
  process.exit(1);
});
