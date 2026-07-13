import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const textColumn = <TName extends string>(name: TName) => text(name, { mode: 'text' });
const uuid = <TName extends string>(name: TName) => textColumn(name).primaryKey().$defaultFn(() => crypto.randomUUID());

export const locations = sqliteTable('location', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  parentId: integer('parent_id').references((): AnySQLiteColumn => locations.id),
  name: textColumn('name').notNull(),
}, (table) => ({
  parentNameUnique: uniqueIndex('location_parent_id_name_unique').on(table.parentId, table.name),
}));

export const brands = sqliteTable('brand', {
  id: uuid('id'),
  name: textColumn('name').notNull().unique(),
});

export const productTypes = sqliteTable('product_type', {
  id: uuid('id'),
  name: textColumn('name').notNull().unique(),
});

export const productVariants = sqliteTable('product_variant', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: textColumn('name').notNull().unique(),
});

export const unitTypes = sqliteTable('unit_type', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: textColumn('name').notNull().unique(),
});

export const unitContents = sqliteTable('unit_content', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  unitTypeId: integer('unit_type_id').notNull().references(() => unitTypes.id),
  amount: real('amount').notNull(),
}, (table) => ({
  unitAmountUnique: uniqueIndex('unit_content_unit_type_id_amount_unique').on(table.unitTypeId, table.amount),
}));

export const products = sqliteTable('product', {
  id: uuid('id'),
  name: textColumn('name').notNull(),
  productTypeId: textColumn('product_type_id').notNull().references(() => productTypes.id),
  brandId: textColumn('brand_id').references(() => brands.id),
  unitContentId: integer('unit_content_id').notNull().references(() => unitContents.id),
  barcode: textColumn('barcode').unique(),
});

export const productVariantTable = sqliteTable('product_variant_table', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: textColumn('product_id').notNull().references(() => products.id),
  productVariantId: integer('product_variant_id').notNull().references(() => productVariants.id),
}, (table) => ({
  productVariantUnique: uniqueIndex('product_variant_table_product_id_variant_id_unique').on(
    table.productId,
    table.productVariantId,
  ),
}));

export const macroNutrients = sqliteTable('macro_nutrients', {
  id: uuid('id'),
  productId: textColumn('product_id').notNull().references(() => products.id),
  unitContentId: integer('unit_content_id').notNull().references(() => unitContents.id),
  totalFat: real('total_fat'),
  unsaturatedFat: real('unsaturated_fat'),
  saturatedFat: real('saturated_fat'),
  totalCarbs: real('total_carbs'),
  sugars: real('sugars'),
  fibre: real('fibre'),
  protein: real('protein'),
});

export const storageRecords = sqliteTable('storage_record', {
  id: uuid('id'),
  productId: textColumn('product_id').notNull().references(() => products.id),
  locationId: integer('location_id').notNull().references(() => locations.id),
  remainingAmount: integer('remaining_amount').notNull(),
  expirationDate: textColumn('expiration_date'),
});

export const unitType = unitTypes;
