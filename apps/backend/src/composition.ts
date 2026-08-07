import { createApp } from "./app.ts";
import type { BackendConfig } from "./config.ts";
import { createDatabase, createDatabaseReadinessProbe, type DatabaseResource } from "./db/index.ts";
import { createAuthAdapter } from "./modules/auth/adapters/better-auth.adapter.ts";
import { createCatalogAuthorization } from "./modules/auth/routes/catalog-authorization.middleware.ts";
import { createSessionResolver } from "./modules/auth/services/session-resolution.service.ts";
import { createDrizzleConsumptionLogRepository } from "./modules/calorie-tracker/repositories/drizzle-consumption-log.repository.ts";
import { createDrizzleDishRepository } from "./modules/calorie-tracker/repositories/drizzle-dish.repository.ts";
import { createDrizzleNutritionGoalRepository } from "./modules/calorie-tracker/repositories/drizzle-nutrition-goal.repository.ts";
import { calorieTrackerRoutes } from "./modules/calorie-tracker/routes/calorie-tracker.routes.ts";
import { systemClock } from "./modules/calorie-tracker/services/calorie-tracker-service-support.ts";
import { createConsumptionLogService } from "./modules/calorie-tracker/services/consumption-log.service.ts";
import { createDishService } from "./modules/calorie-tracker/services/dish.service.ts";
import { createNutritionSummaryService } from "./modules/calorie-tracker/services/nutrition-summary.service.ts";
import { createPackageSelectionService } from "./modules/calorie-tracker/services/package-selection.service.ts";
import { createUnifiedSearchService } from "./modules/calorie-tracker/services/unified-search.service.ts";
import { createDrizzleBrandRepository } from "./modules/catalog/internal/brands.repository.ts";
import { createDrizzleCategoryRepository } from "./modules/catalog/internal/category.repository.ts";
import { createDrizzleProductPackageRepository } from "./modules/catalog/internal/product-packages.repository.ts";
import { createDrizzleProductRepository } from "./modules/catalog/internal/products.repository.ts";
import { createDrizzleReferenceDataRepository } from "./modules/catalog/internal/units.repository.ts";
import { createDrizzleConsumptionCatalogReader } from "./modules/catalog/repositories/drizzle-consumption-catalog-reader.ts";
import { catalogRoutes } from "./modules/catalog/routes/catalog.routes.ts";
import { createCatalogQueryService } from "./modules/catalog/services/catalog-query.service.ts";
import { createCatalogReferenceService } from "./modules/catalog/services/catalog-reference.service.ts";
import { createLocalImageService, createPackageImageService } from "./modules/catalog/services/package-image.service.ts";
import { createCatalogProductRouteService, createProductService } from "./modules/catalog/services/products.service.ts";
import { healthRoutes } from "./modules/health/health.routes.ts";
import { createHealthService } from "./modules/health/health.service.ts";
import { createDrizzleInventoryMutationRepository } from "./modules/inventory/repositories/drizzle-inventory-mutation.repository.ts";
import { createDrizzleInventoryRepository } from "./modules/inventory/repositories/drizzle-inventory.repository.ts";
import { inventoryRoutes } from "./modules/inventory/routes/inventory.routes.ts";
import { createInventoryMutationService } from "./modules/inventory/services/inventory-mutation.service.ts";
import { createInventoryQueryService } from "./modules/inventory/services/inventory-query.service.ts";
import { createDrizzleLocationRepository } from "./modules/locations/repositories/drizzle-location.repository.ts";
import { locationRoutes } from "./modules/locations/routes/location.routes.ts";
import { createLocationService } from "./modules/locations/services/location.service.ts";

/** Fully composed backend runtime and its owned resources. */
export type BackendRuntime = {
  readonly app: ReturnType<typeof createApp>;
  readonly resources: DatabaseResource;
  readonly cleanupDeletedConsumptionLogs: ReturnType<typeof createConsumptionLogService>["cleanupDeletedLogs"];
  readonly close: () => void;
};

/**
 * Create the only production and test composition path from explicit configuration.
 *
 * @param config - Validated backend runtime configuration.
 * @returns The composed application and its owned resources.
 */
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
  const dishImages = createLocalImageService(config.databasePath, config.auth.baseUrl, "dish-images", "calorie-tracker/dish-images");

  const catalogReader = createDrizzleConsumptionCatalogReader(database);
  const logRepository = createDrizzleConsumptionLogRepository(database);
  const goalRepository = createDrizzleNutritionGoalRepository(database);
  const dishRepository = createDrizzleDishRepository(database);
  const packageSelection = createPackageSelectionService(catalogReader);
  const unifiedSearch = createUnifiedSearchService({ catalogReader, dishRepository });
  const dishes = createDishService({ catalogReader, dishRepository, clock: systemClock });
  const consumptionLogs = createConsumptionLogService({ catalogReader, logRepository, dishRepository, clock: systemClock });
  const nutritionSummary = createNutritionSummaryService({ catalogReader, logRepository, dishRepository, goalRepository, clock: systemClock });
  const inventoryReader = createDrizzleInventoryRepository(database);
  const inventoryQueries = createInventoryQueryService(inventoryReader);
  const inventoryMutationStore = createDrizzleInventoryMutationRepository(database);
  const inventoryMutations = createInventoryMutationService(inventoryMutationStore);
  const locationStore = createDrizzleLocationRepository(database);
  const locations = createLocationService(locationStore);
  const app = createApp({
    config,
    authHandler: (request) => auth.handler(request),
    catalogRoutes: catalogRoutes({ authorization: createCatalogAuthorization(sessionResolver), packageImages, references, products: productRouteService }),
    calorieTrackerRoutes: calorieTrackerRoutes({ consumptionLogs, dishes, dishImages, nutritionSummary, packageSelection, unifiedSearch, sessionResolver }),
    inventoryRoutes: inventoryRoutes({ inventoryQueries, inventoryMutations, sessionResolver }),
    locationRoutes: locationRoutes({ locations, sessionResolver }),
    healthRoutes: healthRoutes(createHealthService(createDatabaseReadinessProbe(database))),
  });

  return { app, resources, cleanupDeletedConsumptionLogs: consumptionLogs.cleanupDeletedLogs, close: resources.close };
}
