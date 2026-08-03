import { Hono } from "hono";
import type { CatalogReferenceService } from "../services/catalog-reference.service.ts";

/** Create reference-data routes for units and package types. */
/** Create reference-data routes with injected catalog use cases. */
export function unitRoutes(service: Pick<CatalogReferenceService, "findAllPackageTypes" | "findAllUnitTypes">): Hono {
  const { findAllPackageTypes, findAllUnitTypes } = service;
  const router = new Hono();
  router.get("/unit-types", (c) => c.json(findAllUnitTypes().map((unit) => ({
    id: unit.id,
    name: unit.name,
    symbol: unit.symbol,
    dimension: unit.dimension,
    conversionToBase: String(unit.conversionToBase),
  }))));
  router.get("/package-types", (c) => c.json(findAllPackageTypes()));
  return router;
}
