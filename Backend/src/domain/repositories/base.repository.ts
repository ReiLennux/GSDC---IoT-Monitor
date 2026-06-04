export interface PaginationResult<T> {
    data: T[];
    nextCursor?: string | null;
    total?: number;
}

export interface QueryOptions {
    limit?: number;
    cursor?: string;
    reverse?: boolean;
    sortField?: string;
    sortOrder?: number;
}

export interface BaseRepository<T> {
    create(item: T): Promise<T>;
}