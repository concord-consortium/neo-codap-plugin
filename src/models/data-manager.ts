import {
  createDataContext,
  createItems,
  createNewCollection,
  createTable,
  getDataContext,
  sendMessage
} from "@concord-consortium/codap-plugin-api";
import { createGraph } from "../utils/codap-helper";
import { GeoImage } from "./geo-image";
import { NeoDataset, NeoImageInfo } from "./neo-types";
import { kDemoLocation, kImageLoadDelay, kMaxImages, kParallelLoad } from "./config";
import { estimateValueFromHex } from "../utils/color-to-value-helper";

export const kDataContextName = "NEOPluginData";
const kCollectionName = "Available Dates";

async function clearExistingCases(): Promise<void> {
  await sendMessage("delete", `dataContext[${kDataContextName}].allCases`);
}

async function updateDataContextTitle(title: string): Promise<void> {
  await sendMessage("update", `dataContext[${kDataContextName}]`, {
    title
  });
}

interface DatasetItem {
  date: string;
  // In the form #RRGGBB
  color: string;
  // The estimated value based on legend
  value: number;
  // The time to load the image in milliseconds
  loadTime: number;
}

export type ProgressCallback = (current: number, total: number) => void;

export class DataManager {
  private progressCallback?: ProgressCallback;
  ;

  get maxImages(): number {
    const urlParams = new URLSearchParams(window.location.search);
    const maxImages = urlParams.get("maxImages");
    if (maxImages) {
      return parseInt(maxImages, 10);
    }
    return kMaxImages;
  }

  public setProgressCallback(callback: ProgressCallback) {
    this.progressCallback = callback;
  }

  /**
   * Processes a single image and extracts its color at the demo location
   * @param image - Dataset image metadata
   * @returns Promise resolving to a DatasetItem with date and color
   */
  private async processImage(image: NeoImageInfo, neoDataset: NeoDataset): Promise<DatasetItem> {
    const geoImage = new GeoImage(image, neoDataset);
    try {
      const startTime = Date.now();
      await geoImage.loadFromNeoDataset();
      // Note: This load time is not accurate when parallel loading is used because we are basically
      // trying to download all of the images at the same time. The browser queues up the requests
      // and only does batches of them at the same time. So for some images the loadTime will be
      // close to the total time of all the images.
      const loadTime = Date.now() - startTime;
      const color = geoImage.extractColor(kDemoLocation.latitude, kDemoLocation.longitude);
      const colorHex = GeoImage.rgbToHex(color);
      const value = estimateValueFromHex(neoDataset.label, colorHex);
      return {
        date: image.date,
        color: colorHex,
        value,
        loadTime
      };
    } catch (error) {
      console.error(`Failed to process image ${image.id}:`, error);
      // Return a default color for failed images
      return {
        date: image.date,
        color: "#000000",
        value: 0,
        // Use negative value to indicate that the image was not processed
        loadTime: -1
      };
    } finally {
      geoImage.dispose();
    }
  }

  async getData(neoDataset: NeoDataset): Promise<void> {
    try {
      const totalImages = Math.min(neoDataset.images.length, this.maxImages);
      let processedImages = 0;

      const itemMap = new Map<string, DatasetItem>();

      const _processImage = async (img: NeoImageInfo) => {
        const item = await this.processImage(img, neoDataset);
        processedImages++;
        if (this.progressCallback) {
          this.progressCallback(processedImages, totalImages);
        }
        itemMap.set(img.date, item);
      };

      if (kParallelLoad) {
        // Process all images in parallel
        await Promise.all(
          neoDataset.images.map(_processImage)
        );
      } else {
        // Process all images serially
        for (const img of neoDataset.images) {
          if (processedImages >= this.maxImages) {
            break;
          }
          await _processImage(img);
          await new Promise(resolve => setTimeout(resolve, kImageLoadDelay));
        }
      }

      const dates = neoDataset.images.map(img => img.date);
      const sortedDates = dates.sort();
      const items = sortedDates.map(date => itemMap.get(date) as DatasetItem);
      const existingDataContext = await getDataContext(kDataContextName);
      const existingComponents = await sendMessage("get", "componentList");
      const existingGraph = existingComponents.values
                              .find((comp: any) => comp.type === "graph");
      let createDC;
      if (!existingDataContext.success) {
        createDC = await createDataContext(kDataContextName);
      }

      if (existingDataContext?.success || createDC?.success) {
        await updateDataContextTitle(neoDataset.label);
        await this.createDatesCollection();
        await clearExistingCases();
        await createItems(kDataContextName, items);
        await createTable(kDataContextName);
        if (existingGraph) {
          await sendMessage("delete", `component[${existingGraph.id}]`);
        }
        await createGraph(kDataContextName, neoDataset.label, "date", "value");
      }
    } catch (error) {
      console.error("Failed to process dataset:", error);
      throw error;
    }
  }

  private async createDatesCollection(): Promise<void> {
    await createNewCollection(kDataContextName, kCollectionName, [
      { name: "date", type: "date" },
      { name: "color", type: "color" },
      { name: "value", type: "numeric" },
      { name: "loadTime", type: "numeric" }
    ]);
  }
}
