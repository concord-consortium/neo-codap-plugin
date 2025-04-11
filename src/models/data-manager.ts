import {
  createDataContext,
  createItems,
  createNewCollection,
  createTable,
  getDataContext,
  sendMessage
} from "@concord-consortium/codap-plugin-api";
import { NeoDataset, NeoImageInfo } from "./neo-datasets";
import { GeoImage } from "./geo-image";

const kDataContextName = "NEOPluginData";
const kCollectionName = "Available Dates";

async function clearExistingCases(): Promise<void> {
  await sendMessage("delete", `dataContext[${kDataContextName}].allCases`);
}

async function updateDataContextTitle(title: string): Promise<void> {
  await sendMessage("update", `dataContext[${kDataContextName}]`, {
    title
  });
}

// This was the location of Boston, MA with a longitude of -71.0565
// However that is right on the coast so it was picking up the water color
// so we moved it a little further inland to 42.3555, -73
const kDemoLocation = {
  latitude: 42.3555,
  longitude: -73
};

interface DatasetItem {
  date: string;
  // In the form #RRGGBB
  color: string;
  // The time to load the image in milliseconds
  loadTime: number;
}

// Change this to true to load images in parallel. The NEO site seems to
// be rate limited. So loading the in parallel resulted in errors after
// loading about 200 images.
const kParallelLoad = true;
// Change this to increase the delay between loading images serially
const kImageLoadDelay = 500;

// Change this to limit the number of images processed
// With a 100ms delay the NEO site blocked my request after 201 images
// and a total transfer size of 27.2 MB.
// This blocking is for the whole site probably for my public IP address.
// So to be safe I've updated the delay and limited the number of images.
// To handle all of the images and get better speeds we'll need to download
// them to S3 slowly, and then change the runtime code to fetch them from
// there.
const kMaxImages = 100;

export type ProgressCallback = (current: number, total: number) => void;

export class DataManager {
  private progressCallback?: ProgressCallback;

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
      const loadTime = Date.now() - startTime;
      const color = geoImage.extractColor(kDemoLocation.latitude, kDemoLocation.longitude);
      return {
        date: image.date,
        color: GeoImage.rgbToHex(color),
        loadTime
      };
    } catch (error) {
      console.error(`Failed to process image ${image.id}:`, error);
      // Return a default color for failed images
      return {
        date: image.date,
        color: "#000000",
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

      const items: DatasetItem[] = [];

      const _processImage = async (img: NeoImageInfo) => {
        const item = await this.processImage(img, neoDataset);
        processedImages++;
        if (this.progressCallback) {
          this.progressCallback(processedImages, totalImages);
        }
        items.push(item);
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
      { name: "loadTime", type: "numeric" }
    ]);
  }
}
