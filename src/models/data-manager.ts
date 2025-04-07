import {
  createDataContext,
  createItems,
  createNewCollection,
  createTable,
  getDataContext,
  sendMessage
} from "@concord-consortium/codap-plugin-api";
import { DatasetConfig } from "./dataset-config";
import datasetImages from "../data/neo-dataset-images.json";
import { ImageProcessor } from "./image-processor";

export interface DatasetImage {
  date: string;
  id: string;
}

interface DatasetData {
  images: DatasetImage[];
  maxResolution: {
    width: number;
    height: number;
  };
}

type DatasetImagesType = Record<string, DatasetData>;

const typedDatasetImages = datasetImages as DatasetImagesType;
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
const kParallelLoad = false;
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
  private imageProcessor: ImageProcessor;
  private progressCallback?: ProgressCallback;

  constructor() {
    this.imageProcessor = new ImageProcessor();
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
  private async processImage(image: DatasetImage): Promise<DatasetItem> {
    try {
      const startTime = Date.now();
      const img = await this.imageProcessor.loadImageFromNeoDatasetId(image.id);
      const color = this.imageProcessor.extractColor(img, kDemoLocation.latitude, kDemoLocation.longitude);
      const loadTime = Date.now() - startTime;
      return {
        date: image.date,
        color: this.imageProcessor.rgbToHex(color),
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
    }
  }

  async getData(dataset: DatasetConfig): Promise<void> {
    const datasetData = typedDatasetImages[dataset.id];
    if (!datasetData) {
      throw new Error(`Dataset ${dataset.id} not found`);
    }

    try {
      const totalImages = Math.min(datasetData.images.length, this.maxImages);
      let processedImages = 0;

      const items: DatasetItem[] = [];

      const _processImage = async (img: DatasetImage) => {
        const item = await this.processImage(img);
        processedImages++;
        if (this.progressCallback) {
          this.progressCallback(processedImages, totalImages);
        }
        items.push(item);
      };

      if (kParallelLoad) {
        // Process all images in parallel but track progress
        await Promise.all(
          datasetData.images.map(_processImage)
        );
      } else {
        for (const img of datasetData.images) {
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
        await updateDataContextTitle(dataset.label);
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
