import { realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import applicationConfig from "../../apps/calory_tracker/vite.config";

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(sourceDirectory, "../..");
const frontendRoot = join(repositoryRoot, "apps/calory_tracker");
const dependencyRoot = realpathSync(join(repositoryRoot, "node_modules"));

export default {
  ...applicationConfig,
  root: frontendRoot,
  server: {
    ...applicationConfig.server,
    fs: {
      allow: [repositoryRoot, dependencyRoot],
    },
  },
};
