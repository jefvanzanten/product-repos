import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BackendRequestContext } from "../../../core/data/backend-api.server";
import { createProductCatalogApi, type BackendRequestSender } from "./product-catalog-api.server";

const sendBackendRequest = vi.fn<BackendRequestSender>();
const { getConcreteProduct, searchProductCompositions } = createProductCatalogApi(sendBackendRequest);

const composition = {
  id: "00000000-0000-4000-8000-000000000020",
  name: "Tomatenpuree",
  brand: { id: "00000000-0000-4000-8000-000000000021", name: "Heinz" },
  category: { id: 2, name: "Conserven", parentId: 1 },
  categoryPath: [
    { id: 1, name: "Voeding", parentId: null },
    { id: 2, name: "Conserven", parentId: 1 },
  ],
  consumptionType: "FOOD" as const,
  macroProfile: null,
  productCount: 3,
  activeProductCount: 2,
};

const detail = {
  productId: "00000000-0000-4000-8000-000000000022",
  productCompositionId: composition.id,
  displayName: "Heinz Tomatenpuree — blik 200 g",
  compositionName: composition.name,
  brandName: "Heinz",
  categoryPath: "Voeding > Conserven",
  consumptionType: "FOOD" as const,
  packageSummary: "blik 200 g",
  imageUrl: null,
  barcode: null,
  archivedAt: null,
  composition,
  packageTypeId: 1,
  content: { amount: "200", unitTypeId: 1, symbol: "g", dimension: "MASS" as const },
  portion: null,
};

const context: BackendRequestContext = { cookie: "session=test", signal: new AbortController().signal };

describe("product catalog API contracts", () => {
  beforeEach(() => sendBackendRequest.mockReset());

  it("reads an embedded composition from the canonical concrete-product detail response", async () => {
    sendBackendRequest.mockResolvedValue(Response.json(detail));

    const product = await getConcreteProduct(detail.productId, context);

    expect(product.composition).toEqual(composition);
    expect(sendBackendRequest).toHaveBeenCalledOnce();
    expect(sendBackendRequest).toHaveBeenCalledWith(`/products/${detail.productId}`, context, { method: "GET", body: undefined });
  });

  it("reads canonical composition search results without frontend enrichment", async () => {
    sendBackendRequest.mockResolvedValue(Response.json([composition]));

    const products = await searchProductCompositions("Tomatenpuree", context);

    expect(products).toEqual([composition]);
    expect(sendBackendRequest).toHaveBeenCalledOnce();
  });
});
