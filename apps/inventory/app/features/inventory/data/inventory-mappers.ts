import type {
  FullInventoryPresentationGroup as FullInventoryGroupDto,
  InventoryProductSearchResult as InventoryProductDto,
  PhysicalInventoryItem as PhysicalInventoryItemDto,
  PhysicalInventoryItemDetail as PhysicalInventoryItemDetailDto,
  PhysicalInventoryPage as PhysicalInventoryPageDto,
  PhysicalInventoryProductGroup as PhysicalInventoryProductGroupDto,
} from "@product-repos/contracts/inventory";
import type { LocationTreeNode as InventoryLocationDto } from "@product-repos/contracts/locations";
import type {
  FullInventoryGroup,
  InventoryLocation,
  InventoryProduct,
  PhysicalInventoryItem,
  PhysicalInventoryItemDetail,
  PhysicalInventoryPage,
  PhysicalInventoryProductGroup,
} from "../domain/inventory";

/** Map a validated product DTO to the feature-domain product model. */
export function mapInventoryProduct(dto: InventoryProductDto): InventoryProduct {
  return { ...dto };
}

/** Map a validated physical-item DTO to the feature-domain model. */
export function mapPhysicalInventoryItem(dto: PhysicalInventoryItemDto): PhysicalInventoryItem {
  return { ...dto };
}

/** Map a validated physical-item detail DTO to the feature-domain model. */
export function mapPhysicalInventoryItemDetail(dto: PhysicalInventoryItemDetailDto): PhysicalInventoryItemDetail {
  return { ...dto, product: mapInventoryProduct(dto.product) };
}

/** Map a validated full-package group DTO to the feature-domain model. */
export function mapFullInventoryGroup(dto: FullInventoryGroupDto): FullInventoryGroup {
  return { ...dto, itemIds: [...dto.itemIds] };
}

/** Map a validated product group DTO to the feature-domain model. */
export function mapPhysicalInventoryProductGroup(dto: PhysicalInventoryProductGroupDto): PhysicalInventoryProductGroup {
  return {
    ...dto,
    product: mapInventoryProduct(dto.product),
    fullGroups: dto.fullGroups.map(mapFullInventoryGroup),
    partialItems: dto.partialItems.map(mapPhysicalInventoryItemDetail),
  };
}

/** Map a validated cursor page DTO to the feature-domain model. */
export function mapPhysicalInventoryPage(dto: PhysicalInventoryPageDto): PhysicalInventoryPage {
  return { groups: dto.groups.map(mapPhysicalInventoryProductGroup), nextCursor: dto.nextCursor };
}

/** Map a validated recursive location DTO to the feature-domain model. */
export function mapInventoryLocation(dto: InventoryLocationDto): InventoryLocation {
  return { ...dto, children: dto.children.map(mapInventoryLocation) };
}
