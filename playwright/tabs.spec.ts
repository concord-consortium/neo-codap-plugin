import { expect } from "@playwright/test";
import { test } from "./fixtures";

test.describe("Tab Navigation", () => {
  test.beforeEach(async ({ baseURL, page }) => {
    // Navigate to the app before each test
    await page.goto("/");
  });

  test("should show Dataset tab by default", async ({ page }) => {
    // Check that Dataset tab is selected by default
    const datasetTab = page.getByRole("tab", { name: "Dataset" });
    await expect(datasetTab).toHaveAttribute("aria-selected", "true");
  });

  test("should switch to About tab when clicked", async ({ page }) => {
    // Click the About tab
    const aboutTab = page.getByRole("tab", { name: "About" });
    await aboutTab.click();

    // Verify About tab is selected
    await expect(aboutTab).toHaveAttribute("aria-selected", "true");

    // Verify Dataset tab is not selected
    const datasetTab = page.getByRole("tab", { name: "Dataset" });
    await expect(datasetTab).toHaveAttribute("aria-selected", "false");
  });

  test("should show correct content for each tab", async ({ page }) => {
    // Check Dataset tab content
    const datasetTab = page.getByRole("tab", { name: "Dataset" });
    await expect(datasetTab).toBeVisible();
    await expect(page.getByRole("heading", { name: "NASA Earth Observatory" })).toBeVisible();

    // Switch to About tab
    const aboutTab = page.getByRole("tab", { name: "About" });
    await aboutTab.click();

    // Check About tab content
    const aboutContent = page.getByRole("tabpanel", { name: "About" }).getByText("NASA Earth Observatory");
    await expect(aboutContent).toBeVisible();
  });
});
