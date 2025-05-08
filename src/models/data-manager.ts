import {
  ClientNotification,
  codapInterface,
  createChildCollection,
  createDataContext,
  createItems,
  createParentCollection,
  createTable,
  getDataContext,
  sendMessage,
} from "@concord-consortium/codap-plugin-api";
import { decodePng } from "@concord-consortium/png-codec";
import { kChartGraphName, kDataContextName, kMapPinsCollectionName, kXYGraphName } from "../data/constants";
import { createOrUpdateGraphs, createOrUpdateDateSlider, createOrUpdateMap, addConnectingLinesToGraph,
  addRegionOfInterestToGraphs, updateGraphRegionOfInterest, updateLocationColorMap, rescaleGraph
} from "../utils/codap-utils";
import { GeoImage } from "./geo-image";
import { NeoDataset, NeoImageInfo } from "./neo-types";
import { kImageLoadDelay, kMaxSerialImages, kParallelLoad } from "./config";
import { pinLabel, pluginState } from "./plugin-state";

const kDatesCollectionName = "Available Dates";

async function clearExistingCases(): Promise<void> {
  await sendMessage("delete", `dataContext[${kDataContextName}].allCases`);
}

async function updateDataContextTitle(title: string): Promise<void> {
  await sendMessage("update", `dataContext[${kDataContextName}]`, {
    title
  });
}

/**
 * This is a combination of the general pin properties of pinColor and label.
 * Along with the color, paletteIndex, and value which are specific to the image.
 */
interface NeoLoadedImagePin {
  // General pin properties
  label: string;
  pinColor: string;

  // Specific image properties

  // In the form #RRGGBB
  color: string;
  paletteIndex: number;
  value: number | null;
}

/**
 * A hierarchical representation of the loaded image with its pins. This structure is
 * flattened before being sent to CODAP. Also within CODAP the pins are the top level collection not the
 * dates. This facilitates displaying graphs with connecting lines which are separate for each
 * pin collection.
 */
interface NeoLoadedImage {
  date: string;
  loadTime: number;
  url: string;
  pins: Record<string, NeoLoadedImagePin>;
}

/**
 * A flattened representation of the loaded image with its pins. This structure is sent to CODAP.
 */
interface CodapPinItem {
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
  pins?: Record<string, NeoLoadedImagePin>;
}


const dayInSeconds = 24 * 60 * 60;
/**
 * Get a timestamp representing the month and year of the item
 * 24 hours is added to it so that even in timezones that are
 * behind UTC the date will be the same.
 *
 * @param item
 * @returns
 */
function getTimestamp(item: NeoLoadedImage): number {
  return new Date(item.date).getTime() / 1000 + dayInSeconds;
}

export type ProgressCallback = (current: number, total: number) => void;

export class DataManager {
  private progressCallback?: ProgressCallback;
  private reversePalette: Record<number, number> | undefined;
  private loadedImages : NeoLoadedImage[] | undefined;

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
    if (kParallelLoad) {
      return Infinity; // No limit when loading in parallel
    }
    return kMaxSerialImages;
  }

  public setProgressCallback(callback: ProgressCallback) {
    this.progressCallback = callback;
  }

  /**
   * Processes a single image and extracts its color at the pin locations
   * @param image - Dataset image metadata
   * @returns Promise resolving to a DatasetItem with date and color
   */
  private async processImage(image: NeoImageInfo, neoDataset: NeoDataset): Promise<NeoLoadedImage | undefined> {
    const geoImage = new GeoImage(image, neoDataset);
    try {
      const startTime = Date.now();
      await geoImage.loadFromNeoDataset();
      // Note: This load time is not accurate when parallel loading is used because we are basically
      // trying to download all of the images at the same time. The browser queues up the requests
      // and only does batches of them at the same time. So for some images the loadTime will be
      // close to the total time of all the images.
      const loadTime = Date.now() - startTime;

      const neoDatasetImage: NeoLoadedImage = {
        date: image.date,
        loadTime,
        url: geoImage.imageUrl,
        pins: {}
      };

      pluginState.pins.forEach(pin => {
        const color = geoImage.extractColor(pin.lat, pin.long);
        const label = pinLabel(pin);
        const paletteIndex = this.reversePalette?.[GeoImage.rgbToNumber(color)] ?? -1;
        neoDatasetImage.pins[label] = {
          color: GeoImage.rgbToHex(color),
          paletteIndex,
          value: neoDataset.paletteToValue(paletteIndex),
          label,
          pinColor: pin.color,
        };
      });
      return neoDatasetImage;
    } catch (error) {
      console.error(`Failed to process image ${image.id}:`, error);
    } finally {
      geoImage.dispose();
    }
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

      // itemItemMap[date] = NeoDatasetImage2
      const loadedImageMap = new Map<string, NeoLoadedImage>();

      this.progressCallback?.(0, totalImages);

      // NOTE: The images in neoDataset are not really sorted by date, so taking
      // a slice of the first N images may not result in a consecutive set of dates.
      const limitedImageInfo = neoDataset.images.slice(0, totalImages);

      await this.loadPalette();

      const _processImage = async (img: NeoImageInfo) => {
        const imageItem = await this.processImage(img, neoDataset);
        processedImages++;
        this.progressCallback?.(processedImages, totalImages);
        if (!imageItem) {
          return;
        }
        loadedImageMap.set(img.date, imageItem);
      };

      if (kParallelLoad) {
        // Process all images in parallel
        await Promise.all(
          limitedImageInfo.map(_processImage)
        );
      } else {
        // Process all images serially
        for (const img of limitedImageInfo) {
          await _processImage(img);
          await new Promise(resolve => setTimeout(resolve, kImageLoadDelay));
        }
      }

      const dates = limitedImageInfo.map(img => img.date);
      const sortedDates = dates.sort();
      this.loadedImages = sortedDates.map(date => loadedImageMap.get(date)).filter((item) => !!item);

      // We always setup the slider and update the map even if there are no pins
      await this.createOrUpdateSlider();
      await this.updateMapAndGraphsWithItemIndex(0, true);

      if (pluginState.pins.length === 0) {
        // No pins available, so all we do is create the slider
        // NOTE: If the pins are all removed we don't currently update the graphs or table.
        // Perhaps we should?
        return;
      }

      const existingDataContext = await getDataContext(kDataContextName);
      let createDC;
      if (!existingDataContext.success) {
        createDC = await createDataContext(kDataContextName);
      }

      if (!existingDataContext?.success && !createDC?.success) {
        console.error("Failed to create or get data context:", existingDataContext);
        return;
      }

      // Create the flat item array from the images
      const items: CodapPinItem[] = [];
      this.loadedImages.forEach(image => {
        if (!image?.pins) {
          return;
        }
        Object.values(image.pins).forEach(pin => {
          items.push({
            date: image.date,
            color: pin.color,
            paletteIndex: pin.paletteIndex,
            value: pin.value,
            label: pin.label,
            loadTime: image.loadTime,
            pinColor: pin.pinColor,
            url: image.url
          });
        });
      });

      // FIXME: Change pin lat lon to geoname
      const pinColorMap: Record<string, string> = {};
      pluginState.pins.forEach(pin => {
        pinColorMap[`${parseFloat(pin.lat.toFixed(2))}, ${parseFloat(pin.long.toFixed(2))}`] = pin.color;
      });

      await updateDataContextTitle(neoDataset.label);
      await this.createMapPinsCollection();
      await this.createDatesChildCollection();
      await clearExistingCases();
      await createItems(kDataContextName, items);
      await createTable(kDataContextName);
      // The codap-plugin-api does not apply colormap property to attributes
      // so we update the attribute after the collection is created
      await updateLocationColorMap(pinColorMap);
      // We can't add the connecting lines on the first graph creation so we update it later
      await createOrUpdateGraphs(kDataContextName,
        [ { name: kXYGraphName,
            title: `${neoDataset.label} Plot`,
            xAttrName: "date",
            yAttrName: "value",
            legendAttrName: "label"
          },
          { name: kChartGraphName,
            title: `${neoDataset.label} Chart`,
            xAttrName: "label",
            yAttrName: "date",
            legendAttrName: "color"
          }
      ]);
      await this.createOrUpdateSlider();
      await this.updateMapAndGraphsWithItemIndex(0);
      await addConnectingLinesToGraph();
      const roiPosition = getTimestamp(this.loadedImages[0]);
      await addRegionOfInterestToGraphs(roiPosition);
      await rescaleGraph(kXYGraphName);
      await rescaleGraph(kChartGraphName);

    } catch (error) {
      console.error("Failed to process dataset:", error);
      throw error;
    }
  }

  private async createOrUpdateSlider(): Promise<void> {
    if (!this.loadedImages) {
      return;
    }

    if (this.loadedImages.length === 0) {
      console.warn("No items to create or update the slider");
      return;
    }

    const value = getTimestamp(this.loadedImages[0]);
    const lowerBound = value;
    const upperBound = getTimestamp(this.loadedImages[this.loadedImages.length - 1]);
    await createOrUpdateDateSlider(value, lowerBound, upperBound);
  }

  public async updateMapAndGraphsWithItemIndex(index: number, skipGraphs?: boolean): Promise<void> {
    const { neoDataset, pins } = pluginState;
    if (!neoDataset) {
      console.error("No dataset specified");
      return;
    }

    if (!this.loadedImages || index < 0 || index >= this.loadedImages.length) {
      console.error("No items or invalid index");
      return;
    }
    const item = this.loadedImages[index];
    await createOrUpdateMap(`${neoDataset.label} - ${item.date}`, item.url);

    if (skipGraphs || pins.length === 0) {
      // No pins available, so we don't need to update the graphs
      return;
    }

    const startTime = getTimestamp(item);
    await updateGraphRegionOfInterest(kDataContextName, startTime);
  }

  private handleGlobalUpdate(notification: ClientNotification) {
    if (!this.loadedImages) {
      return;
    }
    // convert to number
    const timestamp = Number(notification.values.globalValue);

    // Find the item index that matches the timestamp
    const itemIndex = this.loadedImages.findIndex((item, index) => {
      if (!this.loadedImages) return false;
      const itemTimestamp = getTimestamp(item);
      const nextItemIndex = index + 1;
      const nextItemTimestamp = nextItemIndex >= this.loadedImages.length
        ? Number.MAX_SAFE_INTEGER
        : getTimestamp(this.loadedImages[nextItemIndex]);
      return timestamp >= itemTimestamp && timestamp < nextItemTimestamp;
    });
    if (itemIndex !== -1) {
      this.updateMapAndGraphsWithItemIndex(itemIndex);
    }
  }

  private async createDatesChildCollection(): Promise<void> {
    await createChildCollection(kDataContextName, kDatesCollectionName, kMapPinsCollectionName, [
      { name: "date", type: "date" },
      { name: "color", type: "color" },
      { name: "paletteIndex", type: "numeric" },
      { name: "value", type: "numeric" },
      { name: "loadTime", type: "numeric" },
      { name: "url", type: "categorical" }
    ]);
  }

  private async createMapPinsCollection(): Promise<void> {
    // The codap-plugin-api does not support colormap property to attributes
    // so we update the attribute after the collection is created
    await createParentCollection(kDataContextName, kMapPinsCollectionName, [
      { name: "label", type: "categorical"},
      { name: "pinColor", type: "color" }
    ]);
  }
}
