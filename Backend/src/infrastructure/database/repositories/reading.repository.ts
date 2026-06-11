import { BatchWriteCommand, ScanCommand, type ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { DynamoRepository } from '../dynamo-repository';
import { type PaginationResult } from '../../../domain/repositories/base.repository';
import { Reading } from '../../../domain/entities/reading.entity';
import { ReadingRepository as IReadingRepository, type AnalyticsResult } from '../../../domain/repositories/reading.repository';
import { docClient } from '../dynamodb';
import { env } from '../../../config/env';

export class ReadingDynamoRepository
    extends DynamoRepository<Reading>
    implements IReadingRepository
{
    protected toPersistence(item: Reading): Record<string, unknown> {
        return {
            ...item,
            PK: `DEVICE#${item.deviceId}`,
            SK: `READING#${item.timestamp}`,
            TTL: Math.floor(new Date(item.timestamp).getTime() / 1000) + 30 * 24 * 60 * 60,
        };
    }

    protected fromPersistence(item: Record<string, unknown>): Reading {
        const { PK, SK, TTL, ...rest } = item;
        return rest as unknown as Reading;
    }

    async findByDeviceId(
        deviceId: string,
        limit = 20,
        cursor?: string
    ): Promise<PaginationResult<Reading>> {
        return this._query(`DEVICE#${deviceId}`, {
            limit,
            cursor,
            skBeginsWith: 'READING#',
            reverse: true,
        });
    }

    async findAll(
        limit = 20,
        cursor?: string
    ): Promise<PaginationResult<Reading>> {
        const params: ScanCommandInput = {
            TableName: env.dynamodbTableName,
            FilterExpression: 'begins_with(SK, :prefix)',
            ExpressionAttributeValues: {
                ':prefix': 'READING#',
            },
            Limit: limit,
        };

        if (cursor) {
            params.ExclusiveStartKey = JSON.parse(
                Buffer.from(cursor, 'base64').toString()
            ) as Record<string, unknown>;
        }

        const result = await docClient.send(new ScanCommand(params));
        const items = (result.Items || []).map(item => this.fromPersistence(item));
        const lastKey = result.LastEvaluatedKey;

        return {
            data: items,
            nextCursor: lastKey
                ? Buffer.from(JSON.stringify(lastKey)).toString('base64')
                : null,
        };
    }

    async createBatch(readings: Reading[]): Promise<void> {
        const persistenceItems = readings.map(r => this.toPersistence(r));
        for (let i = 0; i < persistenceItems.length; i += 25) {
            const chunk = persistenceItems.slice(i, i + 25);
            await docClient.send(new BatchWriteCommand({
                RequestItems: {
                    [env.dynamodbTableName]: chunk.map((item) => ({
                        PutRequest: { Item: item },
                    })),
                },
            }));
        }
    }

    async getAnalytics(hours: number, deviceTypeMap?: Record<string, string>): Promise<AnalyticsResult[]> {
        const since = hours > 0
            ? new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
            : null;

        const filterExp = since
            ? 'begins_with(SK, :prefix) AND SK >= :since'
            : 'begins_with(SK, :prefix)';
        const exprValues: Record<string, string> = { ':prefix': 'READING#' };
        if (since) exprValues[':since'] = `READING#${since}`;

        const byType: Record<string, { values: number[]; count: number }> = {};
        let lastEvaluatedKey: Record<string, unknown> | undefined;

        do {
            const result = await docClient.send(new ScanCommand({
                TableName: env.dynamodbTableName,
                FilterExpression: filterExp,
                ExpressionAttributeValues: exprValues,
                ExclusiveStartKey: lastEvaluatedKey,
            }));

            const readings = (result.Items || []).map(item => this.fromPersistence(item));
            for (const r of readings) {
                const key = deviceTypeMap?.[r.deviceId] ?? r.type ?? r.unit;
                if (!byType[key]) byType[key] = { values: [], count: 0 };
                byType[key].values.push(r.value);
                byType[key].count++;
            }

            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        return Object.entries(byType).map(([type, data]) => {
            const sorted = [...data.values].sort((a, b) => a - b);
            return {
                type, count: data.count,
                avg: Math.round((data.values.reduce((s, v) => s + v, 0) / data.values.length) * 100) / 100,
                min: sorted[0], max: sorted[sorted.length - 1],
            };
        });
    }
}
