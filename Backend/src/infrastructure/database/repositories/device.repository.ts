import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoRepository } from '../dynamo-repository';
import { Device } from '../../../domain/entities/device.entity';
import { DeviceRepository as IDeviceRepository } from '../../../domain/repositories/device.repository';
import { DeviceStatus } from '../../../domain/enums';
import { docClient } from '../dynamodb';
import { env } from '../../../config/env';
import { QueryOptions, PaginationResult } from '../../../domain/repositories/base.repository';

export class DeviceDynamoRepository
    extends DynamoRepository<Device>
    implements IDeviceRepository
{
    protected toPersistence(item: Device): any {
        return {
            ...item,
            PK: `DEVICE#${item.deviceId}`,
            SK: 'METADATA',
        };
    }

    protected fromPersistence(item: any): Device {
        const { PK, SK, ...rest } = item;
        return Device.create(rest as Device);
    }

    async findById(id: string): Promise<Device | null> {
        return this._findById(`DEVICE#${id}`, 'METADATA');
    }

    async update(id: string, data: Partial<Device>): Promise<Device> {
        return this._update(`DEVICE#${id}`, 'METADATA', data);
    }

    async delete(id: string): Promise<void> {
        return this._delete(`DEVICE#${id}`, 'METADATA');
    }

    async query(options?: QueryOptions): Promise<PaginationResult<Device>> {
        return this._query('DEVICE#', { ...options, skBeginsWith: 'METADATA' });
    }

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
        return (result.Items || []).map(item => this.fromPersistence(item));
    }

    async findByRack(rackId: string): Promise<Device[]> {
        const result = await docClient.send(new ScanCommand({
            TableName: env.dynamodbTableName,
            FilterExpression: '#sk = :sk',
            ExpressionAttributeNames: { '#sk': 'SK' },
            ExpressionAttributeValues: { ':sk': 'METADATA' },
        }));
        const devices = (result.Items || []).map(item => this.fromPersistence(item));
        return devices.filter((d) => d.location?.rack === rackId);
    }

    async updateStatus(id: string, status: DeviceStatus): Promise<Device> {
        return this.update(id, {
            status,
            updatedAt: new Date().toISOString(),
        } as Partial<Device>);
    }
}
