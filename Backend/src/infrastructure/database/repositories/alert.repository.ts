import { QueryCommand, type QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { DynamoRepository } from '../dynamo-repository';
import { Alert } from '../../../domain/entities/alert.entity';
import { AlertRepository as IAlertRepository } from '../../../domain/repositories/alert.repository';
import { docClient } from '../dynamodb';
import { env } from '../../../config/env';
import { QueryOptions, PaginationResult } from '../../../domain/repositories/base.repository';

export class AlertDynamoRepository
    extends DynamoRepository<Alert>
    implements IAlertRepository
{
    protected toPersistence(item: Alert): Record<string, unknown> {
        return {
            ...item,
            PK: `ALERT#${item.alertId}`,
            SK: 'METADATA',
            GSI1PK: `DEVICE#${item.deviceId}`,
            GSI2PK: 'ALERT',
            GSI2SK: item.createdAt,
        };
    }

    protected fromPersistence(item: Record<string, unknown>): Alert {
        const { PK, SK, GSI1PK, GSI2PK, GSI2SK, ...rest } = item;
        return rest as unknown as Alert;
    }

    async findById(id: string): Promise<Alert | null> {
        return this._findById(`ALERT#${id}`, 'METADATA');
    }

    async query(options?: QueryOptions): Promise<PaginationResult<Alert>> {
        const params: QueryCommandInput = {
            TableName: env.dynamodbTableName,
            IndexName: 'GSI2',
            KeyConditionExpression: 'GSI2PK = :type',
            ExpressionAttributeValues: { ':type': 'ALERT' },
            Limit: options?.limit ?? 100,
            ScanIndexForward: !options?.reverse,
        };

        if (options?.cursor) {
            params.ExclusiveStartKey = JSON.parse(
                Buffer.from(options.cursor, 'base64').toString()
            ) as Record<string, unknown>;
        }

        const result = await docClient.send(new QueryCommand(params));
        const items = (result.Items || []).map(item => this.fromPersistence(item));
        const lastKey = result.LastEvaluatedKey;

        return {
            data: items,
            nextCursor: lastKey
                ? Buffer.from(JSON.stringify(lastKey)).toString('base64')
                : null,
        };
    }

    async findByDeviceId(deviceId: string, limit?: number, cursor?: string): Promise<PaginationResult<Alert>> {
        const params: QueryCommandInput = {
            TableName: env.dynamodbTableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :gsi1pk',
            ExpressionAttributeValues: {
                ':gsi1pk': `DEVICE#${deviceId}`,
            },
            Limit: limit ?? 50,
        };

        if (cursor) {
            params.ExclusiveStartKey = JSON.parse(
                Buffer.from(cursor, 'base64').toString()
            ) as Record<string, unknown>;
        }

        const result = await docClient.send(new QueryCommand(params));
        const items = (result.Items || []).map(item => this.fromPersistence(item));
        const lastKey = result.LastEvaluatedKey;

        return {
            data: items,
            nextCursor: lastKey
                ? Buffer.from(JSON.stringify(lastKey)).toString('base64')
                : null,
        };
    }

    async acknowledge(id: string): Promise<Alert> {
        return this._update(`ALERT#${id}`, 'METADATA', {
            acknowledged: true,
        } as Partial<Alert>);
    }

    async resolve(id: string): Promise<Alert> {
        return this._update(`ALERT#${id}`, 'METADATA', {
            acknowledged: true,
            resolvedAt: new Date().toISOString(),
        } as Partial<Alert>);
    }
}
