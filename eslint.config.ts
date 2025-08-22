import { defineConfig } from "eslint/config";
import tsParser from "@typescript-eslint/parser";
import eslint from '@eslint/js';
import prettierPlugin from "eslint-plugin-prettier";

export default defineConfig(
  eslint.configs.recommended,
  {
  files: ["src/**/*.{ts,tsx}"],
  ignores: ["src/gql/**"],
  plugins: {
    prettier: prettierPlugin,
  },
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      sourceType: "module",
    },
    globals: {
      // Node globals
      process: "readonly",
      __dirname: "readonly",
      module: "readonly",
      require: "readonly",
      // Jest globals
      describe: "readonly",
      test: "readonly",
      expect: "readonly",
      beforeEach: "readonly",
      afterEach: "readonly",
    },
  },
});