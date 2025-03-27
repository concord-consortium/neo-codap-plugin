import { test as setup } from "@playwright/test";
import { Bonjour, Service } from "bonjour-service";

setup("Find dev server", async ({ }) => {
  // We only want to do this if we are not running in CI.
  if (process.env.CI) {
    return;
  }

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

  const port = service.port;
  process.env.DEV_SERVER_PORT = port.toString();
});
