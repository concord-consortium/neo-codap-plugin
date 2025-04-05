import { expect } from "@playwright/test";
import { test } from "./fixtures";

test.describe("ImageProcessor", () => {
  test("ImageProcessor can read color from image", async ({ baseURL, page }) => {
    // Create a test page that draws points on the image
    console.log("baseURL", baseURL);
    await page.goto("/");
    const hexColor = await page.evaluate(async () => {
      // @ts-expect-error - testing runtime class, it shouldn't be imported into this file directly.
      const processor = new window.ImageProcessor();
      const img = await processor.loadImageFromUrl("red_image_720x360.png");
      // const img = await processor.loadImageFromUrl("https://neo.gsfc.nasa.gov/servlet/RenderData?si=1753115&cs=rgb&format=PNG&width=720&height=360");
      const color = processor.extractColor(img, 42.3555, -72);
      return processor.rgbToHex(color);
    });
    expect(hexColor).toBe("#ff0000");
  });
});
