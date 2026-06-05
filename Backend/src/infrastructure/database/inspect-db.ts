import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from './dynamodb';
import { env } from '../../config/env';

export async function inspectDynamoDB() {
    try {
        const result = await docClient.send(new ScanCommand({
            TableName: env.dynamodbTableName,
            Limit: 5
        }));
        
        if (result.Items) {
            result.Items.forEach(item => {
            });
        }
    } catch (err) {
    }
}
