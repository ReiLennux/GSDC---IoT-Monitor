export interface PaginationResult<T> {
    data: T[];
    nextCursor?: string | null;
}

export interface QueryOptions {
    limit?: number;
    cursor?: string;
    skBeginsWith?: string;
    reverse?: boolean;
}

export interface BaseRepository<T> {
    create(item: T): Promise<T>;
    findById(pk: string, sk: string): Promise<T | null>;
    update(pk: string, sk: string, data: Partial<T>): Promise<T>;
    delete(pk: string, sk: string): Promise<void>;
    query(pk: string, options?: QueryOptions): Promise<PaginationResult<T>>;
}