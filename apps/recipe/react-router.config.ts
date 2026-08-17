import type { Config } from "@react-router/dev/config";
import { RECIPE_BASE_PATH } from "./app/core/presentation/routing/recipe-routes";

export default {
  basename: `${RECIPE_BASE_PATH}/`,
  ssr: true,
} satisfies Config;
