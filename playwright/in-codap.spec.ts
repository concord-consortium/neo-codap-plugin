import { expect } from "@playwright/test";
import { test } from "./fixtures.js";

test("App inside of CODAP", async ({ baseURL, page }) => {
  await page.setViewportSize({width: 1400, height: 800});
  const diUrl = `${baseURL}?maxImages=10`;
  // eslint-disable-next-line playwright/no-conditional-in-test
  if (!diUrl) {
    throw new Error("baseURL is not defined");
  }
  await page.addInitScript({content: "localStorage.setItem('debug', 'plugins')"});
  await page.goto(`https://codap3.concord.org/branch/main/?mouseSensor&di=${diUrl}`);

  const iframe = page.frameLocator(".codap-web-view-iframe");

  // Select the land surface dataset because it has the fewest images
  // We select by text instead of getByRole("radio", { name: "Land Surface Temperature (day)" })
  // because Playwright has issues with radio inputs:
  // - https://github.com/microsoft/playwright/issues/13470
  // - https://github.com/microsoft/playwright/issues/17559
  // - https://github.com/microsoft/playwright/issues/20893
  const radio = iframe.getByRole("radiogroup").getByText("Land Surface Temperature (day)");
  await radio.click();

  // Add a pin to the map
  await page.getByTestId("add-pin-button").click();
  await page.locator(".map-pin-layer").first().click({ position: { x: 150, y: 150 } });
  await expect(iframe.getByTestId("number-of-locations"), "Pin should be added").toContainText("Locations: 1");

  await iframe.getByRole("button", { name: "Get Data" }).click();

  // Make sure the table is visible and has something from our data in it
  await expect(page.getByTestId("collection-table-grid").nth(1)).toBeVisible();
  await expect(page.getByTestId("collection-table-grid").nth(1), "Table should contain date")
    .toContainText("1/1", { timeout: 30000 });

  // Make sure there is a slider with the correct value
  await expect(page.getByTestId("slider-variable-name-text")).toContainText("Date");
  await expect(page.getByTestId("slider-variable-value-text-input")).toHaveValue("1/2024");

  // Move the slider and make sure the map date changes
  const sliderThumb = page.getByTestId("slider-thumb-icon");
  await sliderThumb.hover({position: {x: 3, y: 3}});
  // eslint-disable-next-line playwright/no-conditional-in-test
  const box = await sliderThumb.boundingBox() || {x: 0, y: 0};
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y);
  await page.mouse.up();

  const mapTile = page.getByTestId("codap-map");
  const mapTitle = mapTile.getByTestId("component-title-bar");
  await expect(mapTitle).toContainText("2024-04-01");

  const iframeUrl = await iframe.owner().getAttribute("src");
  // eslint-disable-next-line playwright/no-conditional-in-test
  if (!iframeUrl) {
    throw new Error("iframeUrl is null");
  }

  const iframeFrame = page.frame({ url: iframeUrl});

  // eslint-disable-next-line playwright/no-conditional-in-test
  if (!iframeFrame) {
    throw new Error("iframeFrame is null");
  }

  // Reload the page to make sure it doesn't recreate the table, map, or slider
  await iframeFrame.goto(iframeFrame.url());

  // Get some different data after reloading to make sure the app works
  await iframe.getByRole("button", { name: "Get Data" }).click();

  // Need to wait until everything is loaded
  // The map title is the last thing to be updated
  // The rainfall dataset might take a while to load
  await expect(mapTitle).toContainText("Rainfall", { timeout: 7000 });

  await expect(page.getByTestId("case-table")).toHaveCount(1);
  await expect(page.getByTestId("codap-slider")).toHaveCount(1);
  await expect(page.getByTestId("codap-map")).toHaveCount(1);
  await expect(page.getByTestId("codap-graph")).toHaveCount(1);

  //make sure the graph opens and have the correct axes attributes
  await expect(page.locator(".Graph-title-bar").nth(0)).toContainText("Rainfall Plot");
  await expect(page.getByTestId("axis-legend-attribute-button-bottom").nth(0)).toContainText("date");
  await expect(page.getByTestId("axis-legend-attribute-button-left").nth(0)).toContainText("value");
  await expect(page.getByTestId("axis-legend-attribute-button-legend").nth(0)).toContainText("label");
  page.getByTestId("codap-graph").nth(0).click({ position: { x: 10, y: 10 } });
  await expect(page.getByTestId("graph-display-values-button")).toBeVisible();
  page.getByTestId("graph-display-values-button").nth(0).click();
  await expect(page.getByTestId("adornment-checkbox-connecting-lines")).toBeChecked();
});
