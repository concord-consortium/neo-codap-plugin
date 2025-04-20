import { expect } from "@playwright/test";
import { test } from "./fixtures.js";

test("App inside of CODAP", async ({ baseURL, page }) => {
  await page.setViewportSize({width: 1400, height: 800});
  const diUrl = `${baseURL}?maxImages=2`;
  await page.addInitScript({content: "localStorage.setItem('debug', 'plugins')"});
  await page.goto(`https://codap3.concord.org/branch/main/?mouseSensor&di=${diUrl}`);

  const iframe = page.frameLocator(".codap-web-view-iframe");
  const iframeFrame = page.frame({ url: diUrl});

  // Select the land surface dataset because it has the fewest images
  // We select by text instead of getByRole("radio", { name: "Land Surface Temperature [day]" })
  // because Playwright has issues with radio inputs:
  // - https://github.com/microsoft/playwright/issues/13470
  // - https://github.com/microsoft/playwright/issues/17559
  // - https://github.com/microsoft/playwright/issues/20893
  const radio = iframe.getByRole("radiogroup").getByText("Land Surface Temperature [day]");
  await radio.click();

  // Add a pin to the map
  await page.getByTestId("add-pin-button").click();
  await page.locator(".map-pin-layer").first().click({ position: { x: 150, y: 150 } });
  await expect(iframe.getByTestId("number-of-locations"), "Pin should be added").toContainText("Locations: 1");

  await iframe.getByRole("button", { name: "Get Data" }).click();

  // Make sure the table has something from our data in it
  await expect(page.getByTestId("collection-table-grid"), "Table should contain date")
    .toContainText("1/1/2001", { timeout: 30000 });

  // Make sure there is a slider with the correct value
  await expect(page.getByTestId("slider-variable-name-text")).toContainText("Date");
  await expect(page.getByTestId("slider-variable-value-text-input")).toHaveValue("1/2001");

  // eslint-disable-next-line playwright/no-conditional-in-test
  if (!iframeFrame) {
    throw new Error("iframeFrame is null");
  }

  // Reload the page to make sure it doesn't recreate the table, map, or slider
  await iframeFrame.goto(iframeFrame.url());

  await expect(page.getByTestId("case-table")).toHaveCount(1);
  await expect(page.getByTestId("codap-slider")).toHaveCount(1);
  await expect(page.getByTestId("codap-map")).toHaveCount(1);

});
