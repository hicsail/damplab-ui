import { defineConfig } from "eslint/config";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import prettierPlugin from "eslint-plugin-prettier";

export default defineConfig({
  files: ["src/**/*.{ts,tsx}"],
  ignores: ["src/gql/**"],
  plugins: {
    "@typescript-eslint": tsPlugin,
    prettier: prettierPlugin,
  },
  rules: {
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "prettier/prettier": ["warn", {}, { usePrettierrc: true }],
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