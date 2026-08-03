import { createApp } from "./app.ts";
import type { BackendConfig } from "./config.ts";
import { createDatabase, createDatabaseReadinessProbe, type DatabaseResource } from "./db/index.ts";
import { createAuthAdapter } from "./modules/auth/adapters/better-auth.adapter.ts";
import { createCatalogAuthorization } from "./modules/auth/routes/catalog-authorization.middleware.ts";
import { createSessionResolver } from "./modules/auth/services/session-resolution.service.ts";
import { createDrizzleConsumptionLogRepository } from "./modules/calorie-tracker/repositories/drizzle-consumption-log.repository.ts";
import { createDrizzleNutritionGoalRepository } from "./modules/calorie-tracker/repositories/drizzle-nutrition-goal.repository.ts";
import { calorieTrackerRoutes } from "./modules/calorie-tracker/routes/calorie-tracker.routes.ts";
import { systemClock } from "./modules/calorie-tracker/services/calorie-tracker-service-support.ts";
import { createConsumptionLogService } from "./modules/calorie-tracker/services/consumption-log.service.ts";
import { createNutritionSummaryService } from "./modules/calorie-tracker/services/nutrition-summary.service.ts";
import { createPackageSelectionService } from "./modules/calorie-tracker/services/package-selection.service.ts";
import { createDrizzleBrandRepository } from "./modules/catalog/internal/brands.repository.ts";
import { createDrizzleCategoryRepository } from "./modules/catalog/internal/category.repository.ts";
import { createDrizzleProductPackageRepository } from "./modules/catalog/internal/product-packages.repository.ts";
import { createDrizzleProductRepository } from "./modules/catalog/internal/products.repository.ts";
import { createDrizzleReferenceDataRepository } from "./modules/catalog/internal/units.repository.ts";
import { createDrizzleConsumptionCatalogReader } from "./modules/catalog/repositories/drizzle-consumption-catalog-reader.ts";
import { catalogRoutes } from "./modules/catalog/routes/catalog.routes.ts";
import { createCatalogQueryService } from "./modules/catalog/services/catalog-query.service.ts";
import { createCatalogReferenceService } from "./modules/catalog/services/catalog-reference.service.ts";
import { createPackageImageService } from "./modules/catalog/services/package-image.service.ts";
import { createCatalogProductRouteService, createProductService } from "./modules/catalog/services/products.service.ts";
import { healthRoutes } from "./modules/health/health.routes.ts";
import { createHealthService } from "./modules/health/health.service.ts";

/** Fully composed backend runtime and its owned resources. */
export type BackendRuntime = {
  readonly app: ReturnType<typeof createApp>;
  readonly resources: DatabaseResource;
  readonly cleanupDeletedConsumptionLogs: ReturnType<typeof createConsumptionLogService>["cleanupDeletedLogs"];
  readonly close: () => void;
};

/** Create the only production/test composition path from explicit configuration. */
export function createBackendRuntime(config: BackendConfig): BackendRuntime {
  const resources = createDatabase(config);
  const database = resources.database;
  const auth = createAuthAdapter({ database, config });
  const sessionResolver = createSessionResolver(auth);

  const brands = createDrizzleBrandRepository(database);
  const categories = createDrizzleCategoryRepository(database);
  const referenceData = createDrizzleReferenceDataRepository(database);
  const packages = createDrizzleProductPackageRepository(database, referenceData);
  const products = createDrizzleProductRepository(database, { brands, categories, packages, referenceData });
  const references = createCatalogReferenceService({ brands, categories, referenceData });
  const productService = createProductService({ products, referenceData });
  const catalogQueries = createCatalogQueryService({ brands, categories, packages, products });
  const productRouteService = createCatalogProductRouteService(productService, packages, catalogQueries);
  const packageImages = createPackageImageService(config.databasePath, config.auth.baseUrl);

  const catalogReader = createDrizzleConsumptionCatalogReader(database);
  const logRepository = createDrizzleConsumptionLogRepository(database);
  const goalRepository = createDrizzleNutritionGoalRepository(database);
  const packageSelection = createPackageSelectionService(catalogReader);
  const consumptionLogs = createConsumptionLogService({ catalogReader, logRepository, clock: systemClock });
  const nutritionSummary = createNutritionSummaryService({ catalogReader, logRepository, goalRepository, clock: systemClock });
  const app = createApp({
    config,
    authHandler: (request) => auth.handler(request),
    catalogRoutes: catalogRoutes({ authorization: createCatalogAuthorization(sessionResolver), packageImages, references, products: productRouteService }),
    calorieTrackerRoutes: calorieTrackerRoutes({ consumptionLogs, nutritionSummary, packageSelection, sessionResolver }),
    healthRoutes: healthRoutes(createHealthService(createDatabaseReadinessProbe(database))),
  });

  return { app, resources, cleanupDeletedConsumptionLogs: consumptionLogs.cleanupDeletedLogs, close: resources.close };
}
