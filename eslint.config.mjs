import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Raw lolboost.gg asset dump (source material to curate files from into
    // public/ — see lib/gameArt.ts, lib/lolAssets.ts) — not part of the app.
    "assets/**",
  ]),
  {
    rules: {
      // `const { secret: _secret, ...rest } = row` is how a field gets dropped
      // from an object, and the name that carries the leading underscore is
      // meant to go unused — that is the whole point of writing it.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
