import { expect } from "@playwright/test";
import { test } from "./fixtures";

test.describe("GeoImage", () => {
  test("GeoImage can read color from image", async ({ baseURL, page }) => {
    // Create a test page that draws points on the image
    await page.goto("/");
    const hexColor = await page.evaluate<Promise<string>>(async () => {
      // @ts-expect-error - testing runtime class, it shouldn't be imported into this file directly.
      const geoImage = new window.GeoImage();
      const image = await geoImage.loadFromUrl("red_image_720x360.png");
      const color = image.extractColor(42.3555, -72);
      // @ts-expect-error - testing runtime class, it shouldn't be imported into this file directly.
      const result = window.GeoImage.rgbToHex(color);
      geoImage.dispose();
      return result;
    });
    expect(hexColor).toBe("#ff0000");
  });
});
