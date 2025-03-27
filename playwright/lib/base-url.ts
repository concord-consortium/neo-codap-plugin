import { test as base } from "@playwright/test";

function getBaseUrl() {
  const port = process.env.DEV_SERVER_PORT;
  if (!port) {
    throw new Error("DEV_SERVER_PORT is not set");
  }
  return `https://localhost:${port}`;
}

export const test = base.extend({
  baseURL: async ({ baseURL }, use) => {
    // If the baseURL is not set, set it to the dev server URL.
    if (!baseURL) {
      baseURL = getBaseUrl();
    }
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(baseURL);
  },
});

