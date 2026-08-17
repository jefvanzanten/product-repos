import type { Config } from "@react-router/dev/config";
import { CALORIE_TRACKER_BASE_PATH } from "./app/core/presentation/routing/calorie-tracker-routes";

export default {
  basename: `${CALORIE_TRACKER_BASE_PATH}/`,
  ssr: true,
} satisfies Config;
