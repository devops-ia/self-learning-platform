const nextConfig = require("eslint-config-next/core-web-vitals");

module.exports = [
  ...nextConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      // Disabled: intentional Next.js SSR-safe pattern (localStorage access in mount effects)
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
