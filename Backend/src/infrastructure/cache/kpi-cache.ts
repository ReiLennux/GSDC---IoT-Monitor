import NodeCache from 'node-cache';

export const kpiCache = new NodeCache({ stdTTL: 10, checkperiod: 5 });
