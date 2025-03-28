import typescriptEslint from "typescript-eslint";
import baseConfig from "./eslint.config.mjs";

// build/production configuration extends default/development configuration
export default typescriptEslint.config(
  ...baseConfig,
  {
    // Prevent console logging in the app code and tests code when building on the CI server
    files: ["src/**/*.ts", "src/**/*.tsx", "playwright/**/*.ts", "playwright/**/*.tsx"],
    rules: {
      "@eslint-community/eslint-comments/no-unused-disable": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error"
    }
  }
);
