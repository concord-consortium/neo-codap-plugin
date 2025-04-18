import {
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
}

export type ProgressCallback = (current: number, total: number) => void;

export class DataManager {
  private progressCallback?: ProgressCallback;
  private reversePalette: Record<number, number> | undefined;

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
          pinColor: pin.color
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
      const items: DatasetItem[] = [];
      itemMap.forEach(pinItems => {
        const sortedItems = sortedDates.map(date => pinItems.get(date));
        sortedItems.forEach(sortedItem => {
          if (sortedItem) items.push(sortedItem);
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
        await createItems(kDataContextName, items);
        await createTable(kDataContextName);
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
      { name: "label" },
      { name: "paletteIndex", type: "numeric" },
      { name: "value", type: "numeric" },
      { name: "loadTime", type: "numeric" },
      { name: "pinColor", type: "color" }
    ]);
  }
}
