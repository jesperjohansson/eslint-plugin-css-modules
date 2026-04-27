import { defineConfig } from "eslint/config";
import tsParser from "@typescript-eslint/parser";
import cssModules from "@jespers/eslint-plugin-css-modules";

export default defineConfig([
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
      },
    },
    ...cssModules.configs.recommended,
  },
]);
