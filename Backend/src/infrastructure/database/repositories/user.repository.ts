import { GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoRepository } from '../dynamo-repository';
import { User } from '../../../domain/entities/user.entity';
import { UserRepository as IUserRepository } from '../../../domain/repositories/user.repository';
import type { RefreshTokenRecord } from '../../../domain/repositories/user.repository';
import { docClient } from '../dynamodb';
import { env } from '../../../config/env';

export class UserDynamoRepository
    extends DynamoRepository<User>
    implements IUserRepository
{
    async findByEmail(email: string): Promise<User | null> {
        const result = await docClient.send(new QueryCommand({
            TableName: env.dynamodbTableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :email',
            ExpressionAttributeValues: {
                ':email': `EMAIL#${email}`,
            },
        }));
        return (result.Items?.[0] as User) || null;
    }

    async saveRefreshToken(userId: string, jti: string, ttl: number): Promise<void> {
        await docClient.send(new UpdateCommand({
            TableName: env.dynamodbTableName,
            Key: { PK: `REFRESH#${jti}`, SK: `REFRESH#${jti}` },
            UpdateExpression: 'SET GSI1PK = :user, GSI1SK = :sk, #uid = :userId, #j = :jti, #iv = :valid, TTL = :ttl',
            ExpressionAttributeNames: {
                '#uid': 'userId', '#j': 'jti', '#iv': 'isValid',
            },
            ExpressionAttributeValues: {
                ':user': `USER#${userId}`,
                ':sk': `TOKEN#${jti}`,
                ':userId': userId,
                ':jti': jti,
                ':valid': true,
                ':ttl': ttl,
            },
        }));
    }

    async findRefreshToken(jti: string): Promise<RefreshTokenRecord | null> {
        const result = await docClient.send(new GetCommand({
            TableName: env.dynamodbTableName,
            Key: { PK: `REFRESH#${jti}`, SK: `REFRESH#${jti}` },
        }));
        return (result.Item as RefreshTokenRecord) || null;
    }

    async invalidateRefreshToken(jti: string): Promise<void> {
        await docClient.send(new UpdateCommand({
            TableName: env.dynamodbTableName,
            Key: { PK: `REFRESH#${jti}`, SK: `REFRESH#${jti}` },
            UpdateExpression: 'SET #iv = :val',
            ExpressionAttributeNames: { '#iv': 'isValid' },
            ExpressionAttributeValues: { ':val': false },
        }));
    }

    async invalidateAllUserTokens(userId: string): Promise<void> {
        const tokens = await docClient.send(new QueryCommand({
            TableName: env.dynamodbTableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :prefix)',
            ExpressionAttributeValues: {
                ':pk': `USER#${userId}`,
                ':prefix': 'TOKEN#',
            },
        }));

        if (!tokens.Items?.length) return;

        for (const item of tokens.Items) {
            await docClient.send(new UpdateCommand({
                TableName: env.dynamodbTableName,
                Key: { PK: item.PK, SK: item.SK },
                UpdateExpression: 'SET #iv = :val',
                ExpressionAttributeNames: { '#iv': 'isValid' },
                ExpressionAttributeValues: { ':val': false },
            }));
        }
    }
}
