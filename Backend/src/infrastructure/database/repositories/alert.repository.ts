import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoRepository } from '../dynamo-repository';
import { Alert } from '../../../domain/entities/alert.entity';
import { AlertRepository as IAlertRepository } from '../../../domain/repositories/alert.repository';
import { docClient } from '../dynamodb';
import { env } from '../../../config/env';

export class AlertDynamoRepository
    extends DynamoRepository<Alert>
    implements IAlertRepository
{
    async findByDeviceId(deviceId: string): Promise<Alert[]> {
        const result = await docClient.send(new QueryCommand({
            TableName: env.dynamodbTableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :gsi1pk',
            ExpressionAttributeValues: {
                ':gsi1pk': `DEVICE#${deviceId}`,
            },
        }));
        return result.Items as Alert[];
    }

    async acknowledge(id: string): Promise<Alert> {
        return this.update(`ALERT#${id}`, 'METADATA', {
            acknowledged: true,
        } as Partial<Alert>);
    }

    async resolve(id: string): Promise<Alert> {
        return this.update(`ALERT#${id}`, 'METADATA', {
            acknowledged: true,
            resolvedAt: new Date().toISOString(),
        } as Partial<Alert>);
    }
}
