import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["build", ".react-router"]),
  {
    files: ["app/**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { project: ["./tsconfig.json"], tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/only-throw-error": "off",
      "react-hooks/set-state-in-effect": "error",
      "react-refresh/only-export-components": [
        "warn",
        { allowExportNames: ["action", "headers", "loader", "meta"] },
      ],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}"],
    ignores: ["app/**/data/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{
            name: "@product-repos/contracts/recipes",
            message: "Recipe API contracts belong in the data layer. Import a domain or presentation model instead.",
          }],
        },
      ],
    },
  },
  {
    files: ["app/features/*/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "Domain code must remain framework-independent." },
            { name: "react-router", message: "Domain code must remain framework-independent." },
            { name: "@product-repos/contracts/recipes", message: "Transport contracts belong in data." },
          ],
          patterns: [
            { group: ["**/data/**"], message: "Domain code cannot depend on data." },
            { group: ["**/presentation/**"], message: "Domain code cannot depend on presentation." },
            { group: ["**/core/**"], message: "Feature domain code cannot depend on application infrastructure." },
          ],
        },
      ],
    },
  },
  {
    files: ["app/core/data/**/*.{ts,tsx}", "app/features/*/data/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "Data code must remain independent of React." },
            { name: "react-router", message: "Data code must remain independent of React Router." },
          ],
          patterns: [{ group: ["**/presentation/**"], message: "Data code cannot depend on presentation." }],
        },
      ],
    },
  },
  {
    files: ["app/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["**/features/**"], message: "Core cannot depend on a feature." }] },
      ],
    },
  },
  {
    files: ["*.config.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },
]);
