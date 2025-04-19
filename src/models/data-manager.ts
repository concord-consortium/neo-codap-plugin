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
import { decodePng } from "@lunapaint/png-codec";
import { GeoImage } from "./geo-image";
import { NeoDataset, NeoImageInfo } from "./neo-types";
import { kImageLoadDelay, kMaxImages, kParallelLoad } from "./config";
import { pinLabel, pluginState } from "./plugin-state";
import { createOrUpdateDateSlider, createOrUpdateMap } from "../utils/codap-utils";

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
  label: string;
  paletteIndex: number;
  value: number | null;
  // The time to load the image in milliseconds
  loadTime: number;
  pinColor: string;
  url: string;
}

function getTimestamp(item: DatasetItem): number {
  return new Date(item.date).getTime() / 1000;
}

export type ProgressCallback = (current: number, total: number) => void;

export class DataManager {
  private progressCallback?: ProgressCallback;
  private reversePalette: Record<number, number> | undefined;
  private items: DatasetItem[] | undefined;

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
  private async processImage(image: NeoImageInfo, neoDataset: NeoDataset): Promise<Map<string, DatasetItem>> {
    const geoImage = new GeoImage(image, neoDataset);
    const items = new Map<string, DatasetItem>();
    try {
      const startTime = Date.now();
      await geoImage.loadFromNeoDataset();
      // Note: This load time is not accurate when parallel loading is used because we are basically
      // trying to download all of the images at the same time. The browser queues up the requests
      // and only does batches of them at the same time. So for some images the loadTime will be
      // close to the total time of all the images.
      const loadTime = Date.now() - startTime;

      pluginState.pins.forEach(pin => {
        const color = geoImage.extractColor(pin.lat, pin.long);
        const label = pinLabel(pin);
        const paletteIndex = this.reversePalette?.[GeoImage.rgbToNumber(color)] ?? -1;
        items.set(label, {
          date: image.date,
          color: GeoImage.rgbToHex(color),
          paletteIndex,
          value: neoDataset.paletteToValue(paletteIndex),
          label,
          loadTime,
          pinColor: pin.color,
          url: geoImage.imageUrl
        });
      });
    } catch (error) {
      console.error(`Failed to process image ${image.id}:`, error);
    } finally {
      geoImage.dispose();
    }
    return items;
  }

  async loadPalette() {
    const { neoDataset } = pluginState;
    if (!neoDataset) return;

    const firstImage = neoDataset.images[0];
    const firstGeoImage = new GeoImage(firstImage, neoDataset);
    const response = await fetch(firstGeoImage.imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Buffer = new Uint8Array(arrayBuffer);
    const png = await decodePng(uint8Buffer, { force32: true});

    const { palette } = png;
    if (!palette) throw new Error("Palette not found in PNG");

    // Create a reverse palette for color lookup
    this.reversePalette = {};
    for (let i = 0; i < palette.size; i++) {
      const color = palette.getRgb(i);
      // eslint-disable-next-line no-bitwise
      const colorNum = (color[0] << 16) | (color[1] << 8) | color[2];
      this.reversePalette[colorNum] = i;
    }
  }

  async getData(): Promise<void> {
    const { neoDataset } = pluginState;
    if (!neoDataset) return;

    try {
      const totalImages = Math.min(neoDataset.images.length, this.maxImages);
      let processedImages = 0;

      // itemMap[pinLabel][date] = DatasetItem
      const itemMap = new Map<string, Map<string, DatasetItem>>();

      this.progressCallback?.(0, totalImages);

      await this.loadPalette();

      const _processImage = async (img: NeoImageInfo) => {
        const imageItems = await this.processImage(img, neoDataset);
        processedImages++;
        this.progressCallback?.(processedImages, totalImages);
        imageItems.forEach((item, label) => {
          if (!itemMap.has(label)) {
            itemMap.set(label, new Map());
          }
          itemMap.get(label)?.set(img.date, item);
        });
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
      this.items = [];
      itemMap.forEach(pinItems => {
        const sortedItems = sortedDates.map(date => pinItems.get(date));
        sortedItems.forEach(sortedItem => {
          if (sortedItem) this.items!.push(sortedItem);
        });
      });

      const existingDataContext = await getDataContext(kDataContextName);

      let createDC;
      if (!existingDataContext.success) {
        createDC = await createDataContext(kDataContextName);
      }

      if (existingDataContext?.success || createDC?.success) {
        await updateDataContextTitle(neoDataset.label);
        await this.createDatesCollection();
        await clearExistingCases();
        await createItems(kDataContextName, this.items);
        await createTable(kDataContextName);
        await this.createOrUpdateSlider();
        await this.updateMapWithItemIndex(0);
      }
    } catch (error) {
      console.error("Failed to process dataset:", error);
      throw error;
    }
  }

  private async createOrUpdateSlider(): Promise<void> {
    if (!this.items) {
      return;
    }

    if (this.items.length === 0) {
      console.warn("No items to create or update the slider");
      return;
    }

    const value = getTimestamp(this.items[0]);
    const lowerBound = value;
    const upperBound = getTimestamp(this.items[this.items.length - 1]);
    createOrUpdateDateSlider(value, lowerBound, upperBound);
  }

  public async updateMapWithItemIndex(index: number): Promise<void> {
    const { neoDataset } = pluginState;
    if (!neoDataset) {
      console.error("No dataset specified");
      return;
    }

    if (!this.items || index < 0 || index >= this.items.length) {
      // FIXME: this happens when no pins are on the map and the get data button is pushed
      console.error("No items or invalid index");
      return;
    }
    const item = this.items[index];
    await createOrUpdateMap(`${neoDataset.label} - ${item.date}`);
  }

  private handleGlobalUpdate(notification: ClientNotification) {
    if (!this.items) {
      return;
    }
    // convert to number
    const timestamp = Number(notification.values.globalValue);

    // Find the item index that matches the timestamp
    // FIXME: This isn't efficient because we can now have multiple items for each date
    const itemIndex = this.items.findIndex((item, index) => {
      if (!this.items) return false;
      const itemTimestamp = getTimestamp(item);
      const nextItemIndex = index + 1;
      const nextItemTimestamp = nextItemIndex >= this.items.length
        ? Number.MAX_SAFE_INTEGER
        : getTimestamp(this.items[nextItemIndex]);
      return timestamp >= itemTimestamp && timestamp < nextItemTimestamp;
    });
    if (itemIndex !== -1) {
      this.updateMapWithItemIndex(itemIndex);
    }
  }

  private async createDatesCollection(): Promise<void> {
    await createNewCollection(kDataContextName, kCollectionName, [
      { name: "date", type: "date" },
      { name: "color", type: "color" },
      { name: "label" },
      { name: "paletteIndex", type: "numeric" },
      { name: "value", type: "numeric" },
      { name: "loadTime", type: "numeric" },
      { name: "pinColor", type: "color" },
      { name: "url", type: "categorical" }
    ]);
  }
}
