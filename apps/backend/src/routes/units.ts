import { Hono } from "hono";
import { findAllPackageTypes, findAllUnitTypes } from "../repositories/units.repository";

/** Create reference-data routes for units and package types. */
export function unitRoutes() {
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
