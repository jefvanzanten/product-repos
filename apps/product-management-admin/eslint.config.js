import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["build", "dist", ".react-router"]),
  {
    files: ["app/**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { project: ["./tsconfig.json"], tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/only-throw-error": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "react-hooks/set-state-in-effect": "error",
      "react-refresh/only-export-components": ["warn", { allowExportNames: ["action", "handle", "headers", "links", "loader", "meta", "middleware", "useAdminPath", "useAdminSource"] }],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}"],
    ignores: ["app/**/data/**"],
    rules: {
      "no-restricted-imports": ["error", { paths: [
        { name: "@product-repos/contracts", message: "Backend contracts belong in feature data adapters." },
        { name: "@product-repos/contracts/locations", message: "Backend contracts belong in feature data adapters." },
      ] }],
    },
  },
  {
    files: ["app/core/domain/**/*.{ts,tsx}", "app/features/*/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [
          { name: "react", message: "Domain code must remain framework-independent." },
          { name: "react-router", message: "Domain code must remain framework-independent." },
          { name: "@product-repos/contracts", message: "Transport contracts belong in data." },
          { name: "@product-repos/contracts/locations", message: "Transport contracts belong in data." },
        ],
        patterns: [
          { group: ["**/data/**"], message: "Domain code cannot depend on data." },
          { group: ["**/presentation/**"], message: "Domain code cannot depend on presentation." },
        ],
      }],
    },
  },
  {
    files: ["app/core/presentation/**/*.{ts,tsx}", "app/features/*/presentation/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["**/data/**"], message: "Presentation cannot depend on data adapters; compose them in routes." }] }],
    },
  },
  {
    files: ["app/core/data/**/*.{ts,tsx}", "app/features/*/data/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [
          { name: "react", message: "Data code must remain independent of React." },
          { name: "react-router", message: "Data code must remain independent of React Router." },
        ],
        patterns: [{ group: ["**/presentation/**"], message: "Data code cannot depend on presentation." }],
      }],
    },
  },
  {
    files: ["app/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["**/features/**"], message: "Core cannot depend on application features." }] }],
    },
  },
  {
    files: ["app/**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    files: ["*.config.ts", "*.config.js"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.node },
  },
]);
