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
}

export class DataManager {
  private imageProcessor: ImageProcessor;

  constructor() {
    this.imageProcessor = new ImageProcessor();
  }

  /**
   * Processes a single image and extracts its color at the demo location
   * @param image - Dataset image metadata
   * @returns Promise resolving to a DatasetItem with date and color
   */
  private async processImage(image: DatasetImage): Promise<DatasetItem> {
    try {
      const img = await this.imageProcessor.loadImageFromNeoDatasetId(image.id);
      const color = this.imageProcessor.extractColor(img, kDemoLocation.latitude, kDemoLocation.longitude);
      return {
        date: image.date,
        color: this.imageProcessor.rgbToHex(color)
      };
    } catch (error) {
      console.error(`Failed to process image ${image.id}:`, error);
      // Return a default color for failed images
      // TODO: add a 3rd field to the DatasetItem to indicate if the image was processed successfully
      return {
        date: image.date,
        color: "#000000"
      };
    }
  }

  async getData(dataset: DatasetConfig): Promise<void> {
    const existingDataContext = await getDataContext(kDataContextName);
    let createDC;

    // Get dataset images
    const datasetData = typedDatasetImages[dataset.id];
    if (!datasetData) {
      throw new Error(`Dataset ${dataset.id} not found`);
    }

    try {
      // Process all images in parallel
      const items: DatasetItem[] = await Promise.all(
        datasetData.images.map(img => this.processImage(img))
      );

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
      { name: "color", type: "color" }
    ]);
  }
}
