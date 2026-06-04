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

export abstract class DynamoRepository<T> implements BaseRepository<T> {
    protected abstract toPersistence(item: T): any;
    protected abstract fromPersistence(item: any): T;

    async create(item: T): Promise<T> {
        const persistenceItem = this.toPersistence(item);
        await docClient.send(new PutCommand({
            TableName: env.dynamodbTableName,
            Item: persistenceItem,
        }));
        return item;
    }

    protected async _findById(pk: string, sk: string): Promise<T | null> {
        const result = await docClient.send(new GetCommand({
            TableName: env.dynamodbTableName,
            Key: { PK: pk, SK: sk },
        }));
        return result.Item ? this.fromPersistence(result.Item) : null;
    }

    protected async _update(pk: string, sk: string, data: Partial<T>): Promise<T> {
        // Note: Partial<T> mapping might be tricky if keys are renamed, 
        // but here we mostly use the same names for non-key fields.
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
        return this.fromPersistence(result.Attributes);
    }

    protected async _delete(pk: string, sk: string): Promise<void> {
        await docClient.send(new DeleteCommand({
            TableName: env.dynamodbTableName,
            Key: { PK: pk, SK: sk },
        }));
    }

    protected async _query(pk: string, options?: QueryOptions & { skBeginsWith?: string, skEquals?: string }): Promise<PaginationResult<T>> {
        const exprAttrValues: Record<string, unknown> = { ':pk': pk };
        
        let KeyConditionExpression = 'PK = :pk';
        const ExpressionAttributeValues: Record<string, unknown> = { ...exprAttrValues };
        const ExpressionAttributeNames: Record<string, string> = {};

        if (options?.skBeginsWith) {
            KeyConditionExpression += ' AND begins_with(SK, :sk)';
            ExpressionAttributeValues[':sk'] = options.skBeginsWith;
        } else if (options?.skEquals) {
            KeyConditionExpression += ' AND SK = :sk';
            ExpressionAttributeValues[':sk'] = options.skEquals;
        }

        const params: QueryCommandInput = {
            TableName: env.dynamodbTableName,
            KeyConditionExpression,
            ExpressionAttributeValues,
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
        const items = (result.Items || []).map(item => this.fromPersistence(item));
        const lastKey = result.LastEvaluatedKey;

        return {
            data: items,
            nextCursor: lastKey
                ? Buffer.from(JSON.stringify(lastKey)).toString('base64')
                : null,
        };
    }
}
