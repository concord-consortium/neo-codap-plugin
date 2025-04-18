import { mergeTests } from "@playwright/test";
import { test as coverageTest} from "@bgotink/playwright-coverage";
import { test as baseUrlTest } from "./lib/base-url.js";

export const test = mergeTests(
  // coverageTest will be enabled only in CI by playwright.config.ts
  coverageTest,
  baseUrlTest,
);
