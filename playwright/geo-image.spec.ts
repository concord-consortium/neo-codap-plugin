import { expect } from "@playwright/test";
import { test } from "./fixtures.js";

test.describe("GeoImage", () => {
  test("GeoImage can read color from image", async ({ baseURL, page }) => {
    // Create a test page that draws points on the image
    await page.goto("/");
    const result = await page.evaluate<Promise<{ hexColor: string, pixel: {x: number, y: number} }>>(async () => {
      // @ts-expect-error - testing runtime class, it shouldn't be imported into this file directly.
      const geoImage = new window.GeoImage();
      const image = await geoImage.loadFromUrl("red_image_720x360.png");
      const pixel = image.latLongToPixel(42, -72);
      const color = image.extractColor(42, -72);
      // @ts-expect-error - testing runtime class, it shouldn't be imported into this file directly.
      const hexColor = window.GeoImage.rgbToHex(color);
      geoImage.dispose();
      return {
        hexColor,
        pixel
      };
    });
    expect(result.pixel.x).toBe((180 - 72) * 2);
    expect(result.pixel.y).toBe((90 - 42) * 2);
    expect(result.hexColor).toBe("#ff0000");
  });
});
