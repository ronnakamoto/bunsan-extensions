import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ["**/dist", "**/.eslintrc.js", "**/.prettierrc.js"],
  },
  ...compat.extends("eslint:recommended"),
  {
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
      globals: {
        ...globals.node,
      },

      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",

      parserOptions: {
        project: "tsconfig.json",
      },
    },

    rules: {
      "no-var": "error",
      semi: "error",

      indent: [
        "error",
        2,
        {
          SwitchCase: 1,
        },
      ],

      "no-multi-spaces": "error",
      "space-in-parens": "error",
      "no-multiple-empty-lines": "error",
      "prefer-const": "error",
    },
  },
];
