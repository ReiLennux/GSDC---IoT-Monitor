import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoRepository } from '../dynamo-repository';
import { Device } from '../../../domain/entities/device.entity';
import { DeviceRepository as IDeviceRepository } from '../../../domain/repositories/device.repository';
import { DeviceStatus } from '../../../domain/enums';
import { docClient } from '../dynamodb';
import { env } from '../../../config/env';

export class DeviceDynamoRepository
    extends DynamoRepository<Device>
    implements IDeviceRepository
{
    async findByStatus(status: DeviceStatus): Promise<Device[]> {
        const result = await docClient.send(new ScanCommand({
            TableName: env.dynamodbTableName,
            FilterExpression: '#st = :status AND #sk = :sk',
            ExpressionAttributeNames: { '#st': 'status', '#sk': 'SK' },
            ExpressionAttributeValues: {
                ':status': status,
                ':sk': 'METADATA',
            },
        }));
        return result.Items as Device[];
    }

    async findByRack(rackId: string): Promise<Device[]> {
        const result = await docClient.send(new ScanCommand({
            TableName: env.dynamodbTableName,
            FilterExpression: '#sk = :sk',
            ExpressionAttributeNames: { '#sk': 'SK' },
            ExpressionAttributeValues: { ':sk': 'METADATA' },
        }));
        const devices = result.Items as Device[];
        return devices.filter((d) => d.location?.rack === rackId);
    }

    async updateStatus(id: string, status: DeviceStatus): Promise<Device> {
        return this.update(`DEVICE#${id}`, 'METADATA', {
            status,
            updatedAt: new Date().toISOString(),
        } as Partial<Device>);
    }
}
