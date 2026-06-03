import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoRepository } from '../dynamo-repository';
import { User } from '../../../domain/entities/user.entity';
import { UserRepository as IUserRepository } from '../../../domain/repositories/user.repository';
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
}
