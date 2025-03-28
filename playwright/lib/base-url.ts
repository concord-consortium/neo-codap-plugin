import { test as base } from "@playwright/test";
import { Bonjour, Service } from "bonjour-service";

async function findDevServerPort(): Promise<string> {
  const bonjour = new Bonjour();
  const service = await new Promise<Service | null>((resolve) => {
    // eslint-disable-next-line prefer-const
    let timer: NodeJS.Timeout;
    const browser = bonjour.find({type: "https"}, _service => {
      if (_service.name === process.env.REPOSITORY_NAME) {
        if (timer !== undefined) clearTimeout(timer);
        browser.stop();
        resolve(_service);
      }
    });
    timer = setTimeout(() => {
      browser.stop();
      resolve(null);
    }, 1000);
  });

  if (!service) {
    throw new Error("No https dev server found. Run `npm run start:secure` to start the dev server.");
  }

  return service.port.toString();
}

async function getBaseUrl() {
  let port = process.env.DEV_SERVER_PORT;
  if (!port) {
    port = await findDevServerPort();
    process.env.DEV_SERVER_PORT = port;
  }
  return `https://localhost:${port}`;
}

export const test = base.extend({
  baseURL: async ({ baseURL }, use) => {
    // If the baseURL is not set, set it to the dev server URL.
    if (!baseURL) {
      // We only want to do this if we are not running in CI.
      if (process.env.CI) {
        throw new Error("baseURL must be set in CI environment");
      }
      baseURL = await getBaseUrl();
    }
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(baseURL);
  },
});

