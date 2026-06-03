export interface PaginationResult<T> {
    data: T[];
    nextCursor?: string | null;
}

export interface QueryOptions {
    limit?: number;
    cursor?: string;
    reverse?: boolean;
}

export interface BaseRepository<T> {
    create(item: T): Promise<T>;
}