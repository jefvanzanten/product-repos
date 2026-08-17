import { createApp } from "./app.ts";
import type { BackendConfig } from "./config.ts";
import { createDatabase, createDatabaseReadinessProbe, type DatabaseResource } from "./db/index.ts";
import { createAuthAdapter } from "./modules/auth/adapters/better-auth.adapter.ts";
import { createCatalogAuthorization } from "./modules/auth/routes/catalog-authorization.middleware.ts";
import { createSessionResolver } from "./modules/auth/services/session-resolution.service.ts";
import { createConsumptionLogRepository } from "./modules/calorie-tracker/repositories/consumption-log.repository.ts";
import { createDishRepository } from "./modules/recipes/repositories/dish.repository.ts";
import { createNutritionGoalRepository } from "./modules/calorie-tracker/repositories/nutrition-goal.repository.ts";
import { calorieTrackerRoutes } from "./modules/calorie-tracker/routes/calorie-tracker.routes.ts";
import { systemClock } from "./modules/calorie-tracker/services/calorie-tracker-service-support.ts";
import { createConsumptionLogService } from "./modules/calorie-tracker/services/consumption-log.service.ts";
import { createNutritionSummaryService } from "./modules/calorie-tracker/services/nutrition-summary.service.ts";
import { createPackageSelectionService } from "./modules/calorie-tracker/services/package-selection.service.ts";
import { createUnifiedSearchService } from "./modules/calorie-tracker/services/unified-search.service.ts";
import { createBrandRepository } from "./modules/catalog/repositories/brand.repository.ts";
import { createCategoryRepository } from "./modules/catalog/repositories/category.repository.ts";
import { createProductV2Repository } from "./modules/catalog/repositories/product-v2.repository.ts";
import { createReferenceDataRepository } from "./modules/catalog/repositories/reference-data.repository.ts";
import { createConsumptionCatalogRepository } from "./modules/catalog/repositories/consumption-catalog.repository.ts";
import { catalogRoutes } from "./modules/catalog/routes/catalog.routes.ts";
import { createCatalogReferenceService } from "./modules/catalog/services/catalog-reference.service.ts";
import { createProductImageService } from "./modules/catalog/services/product-image.service.ts";
import { createProductV2Service } from "./modules/catalog/services/product-v2.service.ts";
import { healthRoutes } from "./modules/health/health.routes.ts";
import { createHealthService } from "./modules/health/health.service.ts";
import { createInventoryMutationRepository } from "./modules/inventory/repositories/inventory-mutation.repository.ts";
import { createInventoryRepository } from "./modules/inventory/repositories/inventory.repository.ts";
import { inventoryRoutes } from "./modules/inventory/routes/inventory.routes.ts";
import { createInventoryMutationService } from "./modules/inventory/services/inventory-mutation.service.ts";
import { createInventoryQueryService } from "./modules/inventory/services/inventory-query.service.ts";
import { createLocationRepository } from "./modules/locations/repositories/location.repository.ts";
import { locationRoutes } from "./modules/locations/routes/location.routes.ts";
import { createLocationService } from "./modules/locations/services/location.service.ts";
import { recipeRoutes } from "./modules/recipes/routes/recipe.routes.ts";
import { createRecipeService } from "./modules/recipes/services/recipe.service.ts";

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

  const brands = createBrandRepository(database);
  const categories = createCategoryRepository(database);
  const referenceData = createReferenceDataRepository(database);
  const references = createCatalogReferenceService({ brands, categories, referenceData });
  const productRepository = createProductV2Repository(database);
  const productsV2 = createProductV2Service(productRepository);
  const productImages = createProductImageService(config.databasePath);

  const catalogReader = createConsumptionCatalogRepository(database);
  const logRepository = createConsumptionLogRepository(database);
  const goalRepository = createNutritionGoalRepository(database);
  const dishRepository = createDishRepository(database);
  const packageSelection = createPackageSelectionService(catalogReader);
  const unifiedSearch = createUnifiedSearchService({ catalogReader, dishRepository });
  const consumptionLogs = createConsumptionLogService({ catalogReader, logRepository, dishRepository, clock: systemClock });
  const nutritionSummary = createNutritionSummaryService({ catalogReader, logRepository, dishRepository, goalRepository, clock: systemClock });
  const inventoryReader = createInventoryRepository(database);
  const inventoryQueries = createInventoryQueryService(inventoryReader);
  const inventoryMutationStore = createInventoryMutationRepository(database);
  const inventoryMutations = createInventoryMutationService(inventoryMutationStore);
  const locationStore = createLocationRepository(database);
  const locations = createLocationService(locationStore);
  const recipes = createRecipeService({ catalogReader, dishRepository, clock: systemClock });
  const app = createApp({
    config,
    authHandler: (request) => auth.handler(request),
    catalogRoutes: catalogRoutes({ authorization: createCatalogAuthorization(sessionResolver), references, products: productsV2, productImages }),
    calorieTrackerRoutes: calorieTrackerRoutes({ consumptionLogs, nutritionSummary, packageSelection, unifiedSearch, sessionResolver }),
    inventoryRoutes: inventoryRoutes({ inventoryQueries, inventoryMutations, sessionResolver }),
    locationRoutes: locationRoutes({ locations, sessionResolver }),
    recipeRoutes: recipeRoutes({ recipes, sessionResolver }),
    healthRoutes: healthRoutes(createHealthService(createDatabaseReadinessProbe(database))),
  });

  return { app, resources, cleanupDeletedConsumptionLogs: consumptionLogs.cleanupDeletedLogs, close: resources.close };
}
