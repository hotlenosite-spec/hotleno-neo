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
    // Generated service worker files
    "public/sw.js",
    "public/workbox-*.js",
    "public/workbox-*.js.map",
    // Local supplier certification artifacts are not application source.
    ".tmp/**",
    "integrations/hotelbeds/certification/**",
  ]),
  {
    rules: {
      // Allow underscore-prefixed variables to be unused (for API/interface compatibility)
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }]
    }
  }
]);

export default eslintConfig;
