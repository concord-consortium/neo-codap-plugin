import { expect } from "@playwright/test";
import { test } from "./fixtures";

test.describe("Dataset Selector", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app before each test
    await page.goto("/?noEmbed");

    // Ensure we're on the Dataset tab
    const datasetTab = page.getByRole("tab", { name: "Dataset" });
    await expect(datasetTab).toHaveAttribute("aria-selected", "true");
  });

  test("should select Rainfall dataset by default", async ({ page }) => {
    // Check that Rainfall radio button exists and is checked by default
    const rainfallRadio = page.getByRole("radio", { name: "Rainfall" });
    await expect(rainfallRadio).toBeVisible();
    await expect(rainfallRadio).toBeChecked();

    // Verify other dataset options exist but are not checked
    const otherDatasets = [
      "Carbon Monoxide",
      "Nitrogen Dioxide",
      "Vegetation Index",
      "Land Surface Temperature [day]",
      "Active Fires"
    ];

    for (const dataset of otherDatasets) {
      const radio = page.getByRole("radio", { name: dataset });
      await expect(radio).toBeVisible();
      await expect(radio).not.toBeChecked();
    }
  });

  test("should switch between datasets when clicked", async ({ page }) => {
    // Get all dataset radio buttons
    const datasets = [
      "Rainfall",
      "Carbon Monoxide",
      "Nitrogen Dioxide",
      "Vegetation Index",
      "Land Surface Temperature [day]",
      "Active Fires"
    ];

    // Test switching to each dataset
    for (const dataset of datasets) {
      // Click the radio button for this dataset
      const radio = page.getByRole("radio", { name: dataset });
      // eslint-disable-next-line playwright/no-force-option -- force is needed because chakra puts a span ontop
      await radio.check({ force: true });

      // Verify this dataset is now selected
      await expect(radio).toBeChecked();

      // Verify all other datasets are not selected
      for (const otherDataset of datasets) {
        // eslint-disable-next-line playwright/no-conditional-in-test
        if (otherDataset !== dataset) {
          const otherRadio = page.getByRole("radio", { name: otherDataset });
          // eslint-disable-next-line playwright/no-conditional-expect
          await expect(otherRadio).not.toBeChecked();
        }
      }

      // Verify ARIA attributes
      const radioGroup = page.getByRole("radiogroup");
      await expect(radioGroup).toHaveAttribute("aria-label", "Dataset Selection");
    }
  });

  test("should persist dataset selection when navigating between tabs", async ({ page }) => {
    // Select a non-default dataset (Carbon Monoxide)
    const coDataset = page.getByRole("radio", { name: "Carbon Monoxide" });
    // eslint-disable-next-line playwright/no-force-option -- force is needed because chakra puts a span ontop
    await coDataset.check({ force: true });
    await expect(coDataset).toBeChecked();

    // Navigate to About tab
    const aboutTab = page.getByRole("tab", { name: "About" });
    await aboutTab.click();
    await expect(aboutTab).toHaveAttribute("aria-selected", "true");

    // Navigate back to Dataset tab
    const datasetTab = page.getByRole("tab", { name: "Dataset" });
    await datasetTab.click();
    await expect(datasetTab).toHaveAttribute("aria-selected", "true");

    // Verify Carbon Monoxide is still selected
    await expect(coDataset).toBeChecked();

    // Verify Rainfall (default) is not checked
    const rainfallDataset = page.getByRole("radio", { name: "Rainfall" });
    await expect(rainfallDataset).not.toBeChecked();
  });
});
