import { describe, expect, it } from "bun:test";
import type { ProductCompositionInput } from "@product-repos/contracts";
import type { ProductV2Repository } from "../repositories/product-v2.repository.ts";
import { createProductV2Service } from "./product-v2.service.ts";

const compositionInput: ProductCompositionInput = {
  name: "  Havermout  ",
  categoryId: 1,
  brandId: null,
  consumptionType: "FOOD",
  macroProfile: null,
};

/** Create a typed repository fake focused on composition creation. */
function createRepositoryFake(onCreate: ProductV2Repository["createComposition"]): ProductV2Repository {
  const unused = (): never => { throw new Error("Unexpected repository call"); };
  return {
    searchCompositions: unused,
    createComposition: onCreate,
    updateComposition: unused,
    updateMacroProfile: unused,
    listProducts: unused,
    getProduct: unused,
    createProduct: unused,
    updateProduct: unused,
    setArchived: unused,
  };
}

describe("product v2 service", () => {
  it("normalizes composition names before persistence", () => {
    let received: ProductCompositionInput | undefined;
    const repository = createRepositoryFake((input) => {
      received = input;
      // SAFETY: this focused fake verifies pre-persistence normalization; the returned row is never projected.
      return { ok: true, value: { id: "composition-1" } as never };
    });

    const result = createProductV2Service(repository).createComposition(compositionInput);

    expect(result.ok).toBe(true);
    expect(received?.name).toBe("Havermout");
  });

  it("classifies invalid names without calling persistence", () => {
    let called = false;
    const repository = createRepositoryFake(() => {
      called = true;
      throw new Error("Unexpected repository call");
    });

    const result = createProductV2Service(repository).createComposition({ ...compositionInput, name: "   " });

    expect(result).toEqual({ ok: false, error: { code: "VALIDATION_ERROR", message: "Request is invalid", fields: { name: "Required text is invalid" } } });
    expect(called).toBe(false);
  });
});
