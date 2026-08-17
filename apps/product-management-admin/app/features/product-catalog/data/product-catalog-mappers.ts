import type {
  BrandDto as BrandTransport,
  CategoryDto as CategoryTransport,
  ConcreteProductDetail as ConcreteProductDetailTransport,
  ConcreteProductPage as ConcreteProductPageTransport,
  ConcreteProductSummary as ConcreteProductSummaryTransport,
  PackageTypeDto as PackageTypeTransport,
  ProductCompositionDto as ProductCompositionTransport,
  UnitTypeDto as UnitTypeTransport,
} from "@product-repos/contracts";
import type {
  Brand,
  Category,
  ConcreteProductDetail,
  ConcreteProductPage,
  ConcreteProductSummary,
  PackageType,
  ProductComposition,
  UnitType,
} from "../domain/product-catalog";

/** Map a validated brand DTO into the frontend model. */
export function mapBrand(dto: BrandTransport): Brand {
  return dto;
}

/** Map a validated category DTO into the frontend model. */
export function mapCategory(dto: CategoryTransport): Category {
  return dto;
}

/** Map a validated package-type DTO into the frontend model. */
export function mapPackageType(dto: PackageTypeTransport): PackageType {
  return dto;
}

/** Map a validated unit-type DTO into the frontend model. */
export function mapUnitType(dto: UnitTypeTransport): UnitType {
  return dto;
}

/** Map a validated product summary DTO into the frontend model. */
export function mapConcreteProductSummary(dto: ConcreteProductSummaryTransport): ConcreteProductSummary {
  return dto;
}

/** Map a validated product page DTO into the frontend model. */
export function mapConcreteProductPage(dto: ConcreteProductPageTransport): ConcreteProductPage {
  return { ...dto, items: dto.items.map(mapConcreteProductSummary) };
}

/** Map a validated product composition DTO into the frontend model. */
export function mapProductComposition(dto: ProductCompositionTransport): ProductComposition {
  return { ...dto, brand: dto.brand === null ? null : mapBrand(dto.brand), category: mapCategory(dto.category), categoryPath: dto.categoryPath.map(mapCategory) };
}

/** Map a validated concrete-product detail DTO into the frontend model. */
export function mapConcreteProductDetail(dto: ConcreteProductDetailTransport): ConcreteProductDetail {
  return { ...dto, composition: mapProductComposition(dto.composition) };
}
