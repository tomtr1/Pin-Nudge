// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "src/shared/*"],
  },
  {
    // Apostrophes are plain text in React Native <Text>; there is no HTML to escape.
    rules: { "react/no-unescaped-entities": "off" },
  },
]);
