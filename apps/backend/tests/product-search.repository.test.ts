import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

process.env.DATABASE_URL = ':memory:';

const { sqliteConnection } = await import('../src/db/index');
const {
  searchBrandProducts,
  searchProductVariants,
} = await import('../src/repositories/product-search.repository');

describe('product search repository', () => {
  beforeAll(() => {
    sqliteConnection.exec(`
      create table brand (
        id text primary key not null,
        name text not null unique
      );

      create table product_type (
        id text primary key not null,
        name text not null unique
      );

      create table product (
        id text primary key not null,
        name text,
        product_type_id text not null,
        brand_id text
      );

      create table product_variant (
        id text primary key not null,
        product_id text not null,
        name text not null
      );

      create table packaging_type (
        id integer primary key autoincrement,
        name text not null unique
      );

      create table unit_type (
        id integer primary key autoincrement,
        name text not null unique
      );

      create table unit_content (
        id integer primary key autoincrement,
        unit_type_id integer not null,
        amount real not null
      );

      create table product_sku (
        id text primary key not null,
        product_variant_id text not null,
        unit_content_id integer not null,
        packaging_type_id integer not null,
        units_per_package integer not null default 1,
        barcode text unique
      );
    `);

    sqliteConnection.exec(`
      insert into brand (id, name) values
        ('brand-hb', 'Holland & Barrett'),
        ('brand-magnesium', 'Magnesium Direct');

      insert into product_type (id, name) values
        ('type-supplement', 'Supplement');

      insert into product (id, name, product_type_id, brand_id) values
        ('product-hb', null, 'type-supplement', 'brand-hb'),
        ('product-magnesium', null, 'type-supplement', 'brand-magnesium');

      insert into product_variant (id, product_id, name) values
        ('variant-hb-magnesium', 'product-hb', 'Magnesium 400mg'),
        ('variant-direct-basic', 'product-magnesium', 'Basic');
    `);
  });

  afterAll(() => {
    sqliteConnection.close();
  });

  it('only returns brand products when the brand name matches the query', () => {
    expect(searchBrandProducts('magnesium')).toEqual([{
      brandId: 'brand-magnesium',
      productId: 'product-magnesium',
      productTypeId: 'type-supplement',
      productTypeName: 'Supplement',
      name: 'Magnesium Direct',
      variantCount: 1,
    }]);
  });

  it('still returns variants when the variant name matches the query', () => {
    expect(searchProductVariants('magnesium').map((variant) => ({
      id: variant.id,
      brandName: variant.brandName,
      variantName: variant.variantName,
    }))).toEqual([
      {
        id: 'variant-hb-magnesium',
        brandName: 'Holland & Barrett',
        variantName: 'Magnesium 400mg',
      },
      {
        id: 'variant-direct-basic',
        brandName: 'Magnesium Direct',
        variantName: 'Basic',
      },
    ]);
  });
});
