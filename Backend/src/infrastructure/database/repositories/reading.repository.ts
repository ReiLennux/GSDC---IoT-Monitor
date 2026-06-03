import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoRepository } from '../dynamo-repository';
import { type PaginationResult } from '../../../domain/repositories/base.repository';
import { Reading } from '../../../domain/entities/reading.entity';
import { ReadingRepository as IReadingRepository } from '../../../domain/repositories/reading.repository';
import { docClient } from '../dynamodb';
import { env } from '../../../config/env';

export class ReadingDynamoRepository
    extends DynamoRepository<Reading>
    implements IReadingRepository
{
    async findByDeviceId(
        deviceId: string,
        limit = 20,
        cursor?: string
    ): Promise<{ data: Reading[]; nextCursor: string | null }> {
        const result: PaginationResult<Reading> = await this.query(`DEVICE#${deviceId}`, {
            limit,
            cursor,
            skBeginsWith: 'READING#',
            reverse: true,
        });
        return { data: result.data, nextCursor: result.nextCursor ?? null };
    }

    async createBatch(readings: Reading[]): Promise<void> {
        for (let i = 0; i < readings.length; i += 25) {
            const chunk = readings.slice(i, i + 25);
            await docClient.send(new BatchWriteCommand({
                RequestItems: {
                    [env.dynamodbTableName]: chunk.map((r) => ({
                        PutRequest: { Item: r },
                    })),
                },
            }));
        }
    }
}
