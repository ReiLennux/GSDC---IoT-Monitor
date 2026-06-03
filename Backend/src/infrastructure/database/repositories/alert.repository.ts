import { QueryCommand } from '@aws-sdk/lib-dynamodb';
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
    protected toPersistence(item: Alert): any {
        return {
            ...item,
            PK: `ALERT#${item.alertId}`,
            SK: 'METADATA',
            GSI1PK: `DEVICE#${item.deviceId}`,
        };
    }

    protected fromPersistence(item: any): Alert {
        const { PK, SK, GSI1PK, ...rest } = item;
        return rest as Alert;
    }

    async findById(id: string): Promise<Alert | null> {
        return this._findById(`ALERT#${id}`, 'METADATA');
    }

    async query(options?: QueryOptions): Promise<PaginationResult<Alert>> {
        return this._query('ALERT#', { ...options, skBeginsWith: 'METADATA' });
    }

    async findByDeviceId(deviceId: string): Promise<Alert[]> {
        const result = await docClient.send(new QueryCommand({
            TableName: env.dynamodbTableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :gsi1pk',
            ExpressionAttributeValues: {
                ':gsi1pk': `DEVICE#${deviceId}`,
            },
        }));
        return (result.Items || []).map(item => this.fromPersistence(item));
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
