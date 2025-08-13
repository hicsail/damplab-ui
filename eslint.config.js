import { defineConfig } from "eslint/config";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import prettierPlugin from "eslint-plugin-prettier";

export default defineConfig({
  files: ["src/**/*.{ts,tsx}"],
  ignores: ["src/gql/**"], 
  plugins: {
    "@typescript-eslint": tsPlugin,
    prettier: prettierPlugin,
  },
  /*extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],*/
  rules: {
    "prettier/prettier": "error",
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
  },
  languageOptions: {
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
    }
  }
});
