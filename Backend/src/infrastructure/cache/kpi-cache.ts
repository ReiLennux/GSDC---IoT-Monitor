import NodeCache from 'node-cache';
import type { CacheService } from '../../application/ports/cache-service';

export const kpiCache: CacheService = new NodeCache({ stdTTL: 10, checkperiod: 5 });
