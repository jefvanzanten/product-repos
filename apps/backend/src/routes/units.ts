import { Hono } from "hono";
import { findAllPackageTypes, findAllUnitTypes } from "../repositories/units.repository";

export function unitRoutes() {
  const router = new Hono();
  router.get("/unit-types", (c) => c.json(findAllUnitTypes()));
  router.get("/package-types", (c) => c.json(findAllPackageTypes()));
  return router;
}
