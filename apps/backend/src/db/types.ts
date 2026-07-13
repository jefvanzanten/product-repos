import type { storageRecords, productTypes } from './schema';

export type CreateProductTypeInput = typeof productTypes.$inferInsert;
export type UpdateProductTypeInput = Partial<CreateProductTypeInput>;
export type CreateStorageRecordInput = typeof storageRecords.$inferInsert;
