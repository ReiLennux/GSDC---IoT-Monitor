import { QueryCommand } from '@aws-sdk/lib-dynamodb';
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
    protected toPersistence(item: Device): Record<string, unknown> {
        return {
            ...item,
            PK: `DEVICE#${item.deviceId}`,
            SK: 'METADATA',
            GSI1PK: 'DEVICE',
        };
    }

    protected fromPersistence(item: Record<string, unknown>): Device {
        const { PK, SK, GSI1PK, ...rest } = item;
        return Device.create(rest as unknown as Device);
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
        const allItems: Device[] = [];
        let lastEvaluatedKey: Record<string, unknown> | undefined;
        do {
            const result = await docClient.send(new QueryCommand({
                TableName: env.dynamodbTableName,
                IndexName: 'GSI1',
                KeyConditionExpression: 'GSI1PK = :type',
                ExpressionAttributeValues: { ':type': 'DEVICE' },
                ExclusiveStartKey: lastEvaluatedKey,
            }));
            const items = (result.Items || []).map(item => this.fromPersistence(item));
            allItems.push(...items);
            lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
        } while (lastEvaluatedKey);
        
        let items = allItems;

        if (options?.sortField) {
            const field = options.sortField;
            const order = options.sortOrder === 1 ? 1 : -1;
            items.sort((a, b) => {
                const valA = this.getSortValue(a, field);
                const valB = this.getSortValue(b, field);
                if (valA == null && valB == null) return 0;
                if (valA == null) return -order;
                if (valB == null) return order;
                if (valA < valB) return -order;
                if (valA > valB) return order;
                return 0;
            });
        }

        const total = items.length;
        const limit = options?.limit ?? 10;
        const start = options?.cursor ? parseInt(options.cursor, 10) : 0;
        const offset = Number.isFinite(start) && start > 0 ? start : 0;
        const page = items.slice(offset, offset + limit);
        const nextOffset = offset + limit;
        const nextCursor = nextOffset < total ? String(nextOffset) : null;

        return {
            data: page,
            nextCursor,
            total,
        };
    }

    private getSortValue(item: Device, field: string): string | number | undefined {
        const value = field.split('.').reduce<unknown>((acc, key) => {
            if (acc != null && typeof acc === 'object') {
                return (acc as Record<string, unknown>)[key];
            }
            return undefined;
        }, item);
        if (typeof value === 'string' || typeof value === 'number') return value;
        return undefined;
    }

    async findByStatus(status: DeviceStatus): Promise<Device[]> {
        const allItems: Device[] = [];
        let lastEvaluatedKey: Record<string, unknown> | undefined;
        do {
            const result = await docClient.send(new QueryCommand({
                TableName: env.dynamodbTableName,
                IndexName: 'GSI1',
                KeyConditionExpression: 'GSI1PK = :type',
                ExpressionAttributeValues: { ':type': 'DEVICE' },
                ExclusiveStartKey: lastEvaluatedKey,
            }));
            allItems.push(...(result.Items || []).map(item => this.fromPersistence(item)));
            lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
        } while (lastEvaluatedKey);
        return allItems.filter((d) => d.status === status);
    }

    async findByRack(rackId: string): Promise<Device[]> {
        const allItems: Device[] = [];
        let lastEvaluatedKey: Record<string, unknown> | undefined;
        do {
            const result = await docClient.send(new QueryCommand({
                TableName: env.dynamodbTableName,
                IndexName: 'GSI1',
                KeyConditionExpression: 'GSI1PK = :type',
                ExpressionAttributeValues: { ':type': 'DEVICE' },
                ExclusiveStartKey: lastEvaluatedKey,
            }));
            allItems.push(...(result.Items || []).map(item => this.fromPersistence(item)));
            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);
        return allItems.filter((d) => d.location?.rack === rackId);
    }

    async updateStatus(id: string, status: DeviceStatus): Promise<Device> {
        return this.update(id, {
            status,
            updatedAt: new Date().toISOString(),
        } as Partial<Device>);
    }
}
