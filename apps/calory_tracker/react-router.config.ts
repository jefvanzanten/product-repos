import type { Config } from "@react-router/dev/config";
import { CALORY_TRACKER_BASE_PATH } from "./app/routing/calorie-tracker-routes";

export default {
  basename: `${CALORY_TRACKER_BASE_PATH}/`,
  ssr: true,
} satisfies Config;
