import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/coverage/**", "**/.turbo/**", "**/.next/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["**/test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    // The engine is pure calculation: no Node built-ins, no network, no clock.
    files: ["packages/engine/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:*", "fs", "path", "http", "https", "crypto"],
              message: "The engine must stay pure: no Node built-ins.",
            },
            {
              group: ["@kalachakra/*"],
              message: "The engine imports nothing of ours; rule data is passed in.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "The engine must not use the network." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "The engine must be deterministic." },
        {
          object: "Date",
          property: "now",
          message: "The engine must not read the clock; pass as_of in.",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "The engine must not read the clock; pass as_of in.",
        },
      ],
    },
  },
);
