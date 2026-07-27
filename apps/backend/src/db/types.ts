import type { storageRecords } from './schema';

export type CreateStorageRecordInput = typeof storageRecords.$inferInsert;
