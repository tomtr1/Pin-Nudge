import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Apostrophes and quotes in JSX text render correctly; escaping them hurts readability.
      "react/no-unescaped-entities": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".data/**", "playwright-report/**", "test-results/**", "coverage/**",
    // The iOS app is a separate Expo package with its own lint config (mobile/eslint.config.js).
    "mobile/**",
  ]),
]);

export default eslintConfig;
