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
const REGION = process.env.AWS_REGION || 'us-east-1';

const client = new DynamoDBClient({
  region: REGION,
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
      { AttributeName: 'GSI2PK', AttributeType: 'S' },
      { AttributeName: 'GSI2SK', AttributeType: 'S' },
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
      {
        IndexName: 'GSI2',
        KeySchema: [
          { AttributeName: 'GSI2PK', KeyType: 'HASH' },
          { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
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

async function ensureGSI1(): Promise<void> {
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

async function ensureGSI2(): Promise<void> {
  const desc = await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
  const table = desc.Table;
  if (!table) throw new Error('Table not found');
  const hasGSI2 = table.GlobalSecondaryIndexes?.some((i) => i.IndexName === 'GSI2');
  if (hasGSI2) {
    console.log('GSI2 already exists');
    return;
  }
  console.log('Adding GSI2...');
  await client.send(new UpdateTableCommand({
    TableName: TABLE_NAME,
    AttributeDefinitions: [
      { AttributeName: 'GSI2PK', AttributeType: 'S' },
      { AttributeName: 'GSI2SK', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexUpdates: [
      {
        Create: {
          IndexName: 'GSI2',
          KeySchema: [
            { AttributeName: 'GSI2PK', KeyType: 'HASH' },
            { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
      },
    ],
  }));
  console.log('GSI2 added, waiting for it to become active...');
  let active = false;
  while (!active) {
    await new Promise((r) => setTimeout(r, 1000));
    const d = await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    if (!d.Table) continue;
    active = d.Table.GlobalSecondaryIndexes?.some((i) => i.IndexName === 'GSI2' && i.IndexStatus === 'ACTIVE') ?? false;
  }
  console.log('GSI2 is active');
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

async function seedSystemUser(): Promise<void> {
  console.log('Seeding system user...');

  const systemEmail = process.env.SIM_SYSTEM_EMAIL || 'system@iot.local';
  const systemPassword = process.env.SIM_SYSTEM_PASSWORD || 'System123!';

  const existing = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'GSI1PK = :email',
    ExpressionAttributeValues: { ':email': `EMAIL#${systemEmail}` },
  }));

  if (existing.Items && existing.Items.length > 0) {
    console.log('System user already exists');
    return;
  }

  const passwordHash = await bcrypt.hash(systemPassword, 10);
  const userId = uuid();

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `USER#${userId}`,
      SK: 'METADATA',
      GSI1PK: `EMAIL#${systemEmail}`,
      userId,
      email: systemEmail,
      passwordHash,
      role: UserRole.SYSTEM,
      isActive: true,
    },
  }));

  console.log(`System user seeded: ${systemEmail} / ${systemPassword}`);
}

async function main() {
  const exists = await tableExists();

  if (exists) {
    console.log(`Table ${TABLE_NAME} already exists`);
    await ensureGSI1();
    await ensureGSI2();
  } else {
    await createTable();
  }

  await migrateDevices();
  await seedAdmin();
  await seedSystemUser();
  console.log('Done');
}

main().catch((err) => {
  console.error('Init failed:', err);
  process.exit(1);
});
