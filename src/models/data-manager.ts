import {
  ClientNotification,
  codapInterface,
  createDataContext,
  createItems,
  createNewCollection,
  createTable,
  getDataContext,
  sendMessage
} from "@concord-consortium/codap-plugin-api";
import { GeoImage } from "./geo-image";
import { NeoDataset, NeoImageInfo } from "./neo-types";
import { kDemoLocation, kImageLoadDelay, kMaxImages, kParallelLoad } from "./config";

export const kDataContextName = "NEOPluginData";
const kCollectionName = "Available Dates";
const kMapComponentName = "NeoMap";
const kSliderComponentName = "NeoSlider";
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
  // The time to load the image in milliseconds
  loadTime: number;
  url: string;
}

export type ProgressCallback = (current: number, total: number) => void;

function getTimestamp(date: string): number {
  return new Date(date).getTime() / 1000;
}

export class DataManager {
  private progressCallback?: ProgressCallback;
  // Local cache of dataset items that are sent to CODAP
  items: DatasetItem[] = [];
  private neoDataset: NeoDataset | undefined;

  constructor() {
    this.handleGlobalUpdate = this.handleGlobalUpdate.bind(this);
    codapInterface.on("notify", "global[Date]", this.handleGlobalUpdate);
  }

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
      return {
        date: image.date,
        color: GeoImage.rgbToHex(color),
        loadTime,
        url: geoImage.imageUrl
      };
    } catch (error) {
      console.error(`Failed to process image ${image.id}:`, error);
      // Return a default color for failed images
      return {
        date: image.date,
        color: "#000000",
        // Use negative value to indicate that the image was not processed
        loadTime: -1,
        url: geoImage.imageUrl
      };
    } finally {
      geoImage.dispose();
    }
  }

  async getData(neoDataset: NeoDataset): Promise<void> {
    try {
      const totalImages = Math.min(neoDataset.images.length, this.maxImages);
      let processedImages = 0;

      this.neoDataset = neoDataset;
      this.items = [];
      const itemMap = new Map<string, DatasetItem>();

      const _processImage = async (img: NeoImageInfo) => {
        const item = await this.processImage(img, neoDataset);
        processedImages++;
        if (this.progressCallback) {
          this.progressCallback(processedImages, totalImages);
        }
        itemMap.set(item.date, item);
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
      this.items = sortedDates.map(date => itemMap.get(date) as DatasetItem);

      const existingDataContext = await getDataContext(kDataContextName);

      let createDC;
      if (!existingDataContext.success) {
        createDC = await createDataContext(kDataContextName);
      }

      if (!(existingDataContext?.success || createDC?.success)) {
        return;
      }

      await updateDataContextTitle(neoDataset.label);
      await this.createDatesCollection();
      await clearExistingCases();
      await createItems(kDataContextName, this.items);
      await createTable(kDataContextName);
      await this.createOrUpdateMap(neoDataset.label, this.items[0]);
      await this.createOrUpdateSlider();
    } catch (error) {
      console.error("Failed to process dataset:", error);
      throw error;
    }
  }

  private handleGlobalUpdate(notification: ClientNotification) {
    // convert to number
    const timestamp = Number(notification.values.globalValue);
    console.log("timestamp inf")
    const itemIndex = this.items.findIndex((item, index) => {
      const itemTimestamp = getTimestamp(item.date);
      const nextItemIndex = index + 1;
      const nextItemTimestamp = nextItemIndex >= this.items.length
        ? Number.MAX_SAFE_INTEGER
        : getTimestamp(this.items[nextItemIndex].date);
      return timestamp >= itemTimestamp && timestamp < nextItemTimestamp;
    });
    console.log("handleGlobalUpdate", {
      notification, timestamp,itemIndex,
      timestampInfo: {
        firstItem: getTimestamp(this.items[0].date),
        lastItem: getTimestamp(this.items[this.items.length - 1].date)
      }
     });
    if (itemIndex !== -1) {
      this.updateMapWithItemIndex(itemIndex);
    }
  }

  private async createDatesCollection(): Promise<void> {
    await createNewCollection(kDataContextName, kCollectionName, [
      { name: "date", type: "date" },
      { name: "color", type: "color" },
      { name: "loadTime", type: "numeric" },
      { name: "url", type: "categorical" }
    ]);
  }

  private async createOrUpdateMap(title: string, item: DatasetItem): Promise<void> {
    const existingMap = await sendMessage("get", `component[${kMapComponentName}]`);
    if (!existingMap.success) {
      await sendMessage("create", "component", {
        type: "map",
        name: kMapComponentName,
        title,
      });
    }

    await sendMessage("update", `component[${kMapComponentName}]`, {
      geotiffUrl: item.url,
      title,
    });
  }

  private async createOrUpdateSlider(): Promise<void> {
    const existingGlobal = await sendMessage("get", `global[Date]`);
    if (!existingGlobal.success) {
      await sendMessage("create", "global", {
        name: "Date",
        value: new Date(this.items[0].date).getTime(),
      });
    }

    const existingSlider = await sendMessage("get", `component[${kSliderComponentName}]`);
    if (!existingSlider.success) {
      await sendMessage("create", "component", {
        type: "slider",
        title: kSliderComponentName,
        globalValueName: "Date",
        lowerBound: getTimestamp(this.items[0].date),
        upperBound: getTimestamp(this.items[this.items.length - 1].date),
        value: getTimestamp(this.items[0].date)
      });
    }

    await sendMessage("update", `component[${kSliderComponentName}]`, {
      lowerBound: getTimestamp(this.items[0].date),
      upperBound: getTimestamp(this.items[this.items.length - 1].date),
      value: getTimestamp(this.items[0].date)
    });
  }


  public async updateMapWithItemIndex(index: number): Promise<void> {
    if (index < 0 || index >= this.items.length) {
      throw new Error("Invalid item index");
    }
    const item = this.items[index];
    await this.createOrUpdateMap(`${this.neoDataset?.label} - ${item.date}`, item);
  }
}
