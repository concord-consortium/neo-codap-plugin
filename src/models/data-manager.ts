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

export class DataManager {

  async getData(dataset: DatasetConfig): Promise<void> {
    const existingDataContext = await getDataContext(kDataContextName);
    let createDC;

    // Get dates for the selected dataset
    const dates = typedDatasetImages[dataset.id]?.images.map((img: DatasetImage) => ({ date: img.date })) || [];

    if (!existingDataContext.success) {
      createDC = await createDataContext(kDataContextName);
    }

    if (existingDataContext?.success || createDC?.success) {
      await updateDataContextTitle(dataset.label);
      await this.createDatesCollection();
      await clearExistingCases();
      await createItems(kDataContextName, dates);
      await createTable(kDataContextName);
    }
  }

  private async createDatesCollection(): Promise<void> {
    await createNewCollection(kDataContextName, kCollectionName, [
      { name: "date", type: "date" }
    ]);
  }
}
