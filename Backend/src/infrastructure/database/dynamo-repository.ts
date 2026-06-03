import {
    GetCommand,
    PutCommand,
    UpdateCommand,
    DeleteCommand,
    QueryCommand,
    type QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { docClient } from './dynamodb';
import {
    type BaseRepository,
    type PaginationResult,
    type QueryOptions,
} from '../../domain/repositories/base.repository';
import { env } from '../../config/env';

export abstract class DynamoRepository<T extends { PK: string; SK: string }>
    implements BaseRepository<T>
{
    async create(item: T): Promise<T> {
        await docClient.send(new PutCommand({
            TableName: env.dynamodbTableName,
            Item: item,
        }));
        return item;
    }

    async findById(pk: string, sk: string): Promise<T | null> {
        const result = await docClient.send(new GetCommand({
            TableName: env.dynamodbTableName,
            Key: { PK: pk, SK: sk },
        }));
        return (result.Item as T) || null;
    }

    async update(pk: string, sk: string, data: Partial<T>): Promise<T> {
        const keys = Object.keys(data as object);
        const setExpression = keys.map((_, i) => `#f${i} = :v${i}`).join(', ');
        const attrNames = keys.reduce(
            (acc, k, i) => ({ ...acc, [`#f${i}`]: k }),
            {} as Record<string, string>
        );
        const attrValues = keys.reduce(
            (acc, k, i) => ({ ...acc, [`:v${i}`]: (data as Record<string, unknown>)[k] }),
            {} as Record<string, unknown>
        );

        const result = await docClient.send(new UpdateCommand({
            TableName: env.dynamodbTableName,
            Key: { PK: pk, SK: sk },
            UpdateExpression: `SET ${setExpression}`,
            ExpressionAttributeNames: attrNames,
            ExpressionAttributeValues: attrValues,
            ReturnValues: 'ALL_NEW',
        }));
        return result.Attributes as T;
    }

    async delete(pk: string, sk: string): Promise<void> {
        await docClient.send(new DeleteCommand({
            TableName: env.dynamodbTableName,
            Key: { PK: pk, SK: sk },
        }));
    }

    async query(pk: string, options?: QueryOptions): Promise<PaginationResult<T>> {
        const exprAttrValues: Record<string, unknown> = { ':pk': pk };

        const params: QueryCommandInput = {
            TableName: env.dynamodbTableName,
            KeyConditionExpression: options?.skBeginsWith
                ? 'PK = :pk AND begins_with(SK, :sk)'
                : 'PK = :pk',
            ExpressionAttributeValues: options?.skBeginsWith
                ? { ...exprAttrValues, ':sk': options.skBeginsWith }
                : exprAttrValues,
            Limit: options?.limit ?? 20,
        };

        if (options?.cursor) {
            params.ExclusiveStartKey = JSON.parse(
                Buffer.from(options.cursor, 'base64').toString()
            );
        }

        if (options?.reverse) {
            params.ScanIndexForward = false;
        }

        const result = await docClient.send(new QueryCommand(params));
        const items = result.Items as T[];
        const lastKey = result.LastEvaluatedKey;

        return {
            data: items,
            nextCursor: lastKey
                ? Buffer.from(JSON.stringify(lastKey)).toString('base64')
                : null,
        };
    }
}
