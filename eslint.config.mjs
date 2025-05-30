// @ts-check

import stylisticEslintPlugin from "@stylistic/eslint-plugin";
import stylisticJs from "@stylistic/eslint-plugin-js";
import globals from "globals";
import jest from "eslint-plugin-jest";
import json from "eslint-plugin-json";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import testingLibrary from "eslint-plugin-testing-library";
import tsParser from "@typescript-eslint/parser";
import typescriptEslint, { configs as tsConfigs } from "typescript-eslint";
import js from "@eslint/js";
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import { flatConfigs as importPluginConfig } from "eslint-plugin-import";
import playwright from "eslint-plugin-playwright";

// This helper `config()` function replaces the basic [] used by
// eslint normally:
// https://typescript-eslint.io/packages/typescript-eslint#config
export default typescriptEslint.config(
  {
    name: "ignore dist and node_modules",
    ignores: [
      "dist/",
      "node_modules/",
      ".yalc/",
      ".vscode/",
      "playwright-report/",
      "test-results/"
    ]
  },
  js.configs.recommended,
  tsConfigs.recommended,
  tsConfigs.stylistic,
  // @ts-expect-error for some reason the rules in comments.recommend are not compatible with
  // RuleEntry. In another project using typescript 5.8.2, this was not an issue.
  comments.recommended,
  importPluginConfig.recommended,
  importPluginConfig.typescript,
  react.configs.flat?.recommended,
  reactHooks.configs["recommended-latest"],
  {
    name: "browser files",
    files: ["src/**"],
    languageOptions: {
      globals: globals.browser
    }
  },
  {
    name: "general rules",
    plugins: {
      "@stylistic": stylisticEslintPlugin,
      "@stylistic/js": stylisticJs,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2018,
      sourceType: "module",
    },
    linterOptions: {
      reportUnusedDisableDirectives: false
    },
    settings: {
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"]
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "."
        }
      },
      react: {
        pragma: "React",
        version: "detect"
      }
    },
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-confusing-non-null-assertion": "error",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-shadow": ["error", { builtinGlobals: false, hoist: "all", allow: [] }],
      "@typescript-eslint/no-unused-vars": ["warn", { args: "none", ignoreRestSiblings: true }],
      "@stylistic/semi": ["warn", "always"],
      "curly": ["error", "multi-line", "consistent"],
      "dot-notation": "error",
      "eol-last": "warn",
      "eqeqeq": ["error", "smart"],
      "@eslint-community/eslint-comments/no-unused-disable": "off",   // enabled in eslint.build.config.mjs
      // Note: this has caused slowdowns in large projects
      "import/no-cycle": "warn",
      // Note: this has caused problems with overridden or aliased dependencies
      // like the Concord mobx-state-tree override
      "import/no-extraneous-dependencies": "warn",
      "import/no-useless-path-segments": "warn",
      "import/no-duplicates": "error",
      "@stylistic/js/jsx-quotes": ["error", "prefer-double"],
      "max-len": ["warn", { code: 120, ignoreUrls: true }],
      "no-bitwise": "error",
      "no-debugger": "off",
      "no-sequences": "error",
      "no-shadow": "off", // superseded by @typescript-eslint/no-shadow
      "no-tabs": "error",
      "no-unneeded-ternary": "error",
      // there is a recommended typescript rule for this too, so this might be redundant
      "no-unused-expressions": ["error", { allowShortCircuit: true }],
      "no-unused-vars": "off",  // superseded by @typescript-eslint/no-unused-vars
      "no-useless-call": "error",
      "no-useless-concat": "error",
      "no-useless-rename": "error",
      "no-useless-return": "error",
      "no-var": "error",
      "no-whitespace-before-property": "error",
      "object-shorthand": "error",
      "prefer-const": ["error", { destructuring: "all" }],
      "prefer-object-spread": "error",
      "prefer-regex-literals": "error",
      "prefer-rest-params": "error",
      "prefer-spread": "error",
      "quotes": ["error", "double", { allowTemplateLiterals: true, avoidEscape: true }],
      "radix": "error",
      "react/jsx-closing-tag-location": "error",
      "react/jsx-handler-names": "off",
      "react/jsx-no-useless-fragment": "error",
      "react/no-access-state-in-setstate": "error",
      "react/no-danger": "error",
      "react/no-unsafe": ["off", { checkAliases: true }],
      "react/no-unused-state": "error",
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
    },
  },
  // The projectService is required to use the @typescript-eslint/prefer-optional-chain rule
  // The projectService does not work well with files that aren't configured by a tsconfig.json
  // file, so we only apply it to the files in src and playwright.
  {
    name: "rules only for project and playwright typescript files",
    files: ["src/**/*.ts", "src/**/*.tsx", "playwright/**/*.ts", "playwright/**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/prefer-optional-chain": "warn",
    }
  },
  {
    name: "rules specific to Jest tests",
    files: ["src/**/*.test.*"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    // ts eslint's config function adds back in the `extends` feature of the older eslint
    extends: [
      jest.configs["flat/recommended"],
      testingLibrary.configs["flat/react"]
    ],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      // require() can be useful in mocking
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
      "jest/no-done-callback": "off"
    }
  },
  {
    name: "rules specific to Playwright tests",
    files: ["playwright/**"],
    extends: [
      playwright.configs["flat/recommended"]
    ]
  },
  {
    name: "json files",
    files: ["**/*.json"],
    ...json.configs.recommended
  },
  {
    name: "eslint configs",
    files: ["eslint.*.mjs"],
    languageOptions: {
      globals: {
        ...globals.node
      },
    },
  },
  {
    name: "scripts",
    files: ["scripts/**"],
    languageOptions: {
      globals: {
        ...globals.node
      },
    },
  },
  {
    name: "webpack configs",
    files: ["webpack.config.cjs"],
    languageOptions: {
      globals: {
        ...globals.node
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
      "quotes": ["error", "single", { allowTemplateLiterals: true, avoidEscape: true }],
    }
  },
  {
    name: "postcss",
    files: ["postcss.config.cjs"],
    languageOptions: {
      globals: {
        ...globals.node
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
      "quotes": ["error", "single"],
    }
  }
);
