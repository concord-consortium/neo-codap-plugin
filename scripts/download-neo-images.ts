import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import neoDatasets from "../src/data/neo-dataset-images.json" with { type: "json" };

// To upload the files to S3
// aws s3 sync neo-images s3://models-resources/neo-images/v1 --exclude "*.DS_Store" --cache-control "max-age=31536000"

const OUTPUT_DIR = "neo-images";
const DEFAULT_RESOLUTION = { width: 720, height: 360 };
const DELAY_BETWEEN_DOWNLOADS = 2000; // milliseconds
const ONLY_DOWNLOAD_FIRST_DATASET = false;
const NUMBER_OF_IMAGES_TO_DOWNLOAD = 400;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 5000; // 5 seconds

interface NeoImage {
  date: string;
  id: string;
}

interface Resolution {
  width: number;
  height: number;
}

interface DatasetImages {
  images: NeoImage[];
  maxResolution: Resolution;
}

type Datasets = Record<string, DatasetImages>;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getResolution(maxResolution: Resolution): Resolution {
  // If maxResolution is smaller than our default, use maxResolution
  if (maxResolution.width < DEFAULT_RESOLUTION.width ||
      maxResolution.height < DEFAULT_RESOLUTION.height) {
    return maxResolution;
  }
  return DEFAULT_RESOLUTION;
}

function getResolutionString(resolution: Resolution): string {
  return `${resolution.width}x${resolution.height}`;
}

function constructImageUrl(imageId: string, resolution: Resolution): string {
  return `https://neo.gsfc.nasa.gov/servlet/RenderData?si=${imageId}&cs=rgb&format=PNG&width=${resolution.width}&height=${resolution.height}`;
}

function shouldDownloadFile(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return true;
  }

  try {
    const stats = fs.statSync(filePath);
    // Return true if file is empty (0 bytes)
    return stats.size === 0;
  } catch (error) {
    console.log(`Error checking file ${filePath}:`, error);
    // If we can't check the file for some reason, try downloading it again
    return true;
  }
}

async function downloadImageWithRetry(url: string, outputPath: string, retryCount = 0): Promise<void> {
  try {
    const response = await fetch(url);
    console.log(`Response status: ${response.status} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response body!");
    }

    // Write the response body to the output file
    await pipeline(response.body, fs.createWriteStream(outputPath));

  } catch (error) {
    // Clean up any partial downloads
    if (fs.existsSync(outputPath)) {
      try {
        fs.unlinkSync(outputPath);
      } catch (cleanupError) {
        console.error(`Failed to clean up partial file ${outputPath}:`, cleanupError);
      }
    }

    if (retryCount < MAX_RETRIES) {
      const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(
        `Download failed (attempt ${retryCount + 1}/${MAX_RETRIES + 1}). Retrying in ${retryDelay/1000} seconds...`
      );
      await delay(retryDelay);
      return downloadImageWithRetry(url, outputPath, retryCount + 1);
    }

    console.error(`Error downloading image from ${url} after ${MAX_RETRIES + 1} attempts:`, error.message);
    throw error;
  }
}

async function processDataset(datasetId: string, dataset: DatasetImages): Promise<void> {
  const resolution = getResolution(dataset.maxResolution);
  const resolutionString = getResolutionString(resolution);
  const datasetDir = path.join(OUTPUT_DIR, datasetId, resolutionString);
  const images = dataset.images;

  // Create directories if they don't exist
  fs.mkdirSync(datasetDir, { recursive: true });

  console.log(`Processing dataset: ${datasetId}`);
  console.log(`Using resolution: ${resolutionString}`);
  console.log(`Total images to download: ${images.length}`);

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const outputPath = path.join(datasetDir, `${image.date}.png`);

    if (!shouldDownloadFile(outputPath)) {
      console.log(`Skipping ${image.date}.png (already exists and not empty)`);
      continue;
    }

    const url = constructImageUrl(image.id, resolution);
    const action = fs.existsSync(outputPath) ? "Re-downloading" : "Downloading";
    console.log(`${action} ${image.date}.png (${i + 1}/${images.length})`);

    try {
      await downloadImageWithRetry(url, outputPath);

      // Verify the downloaded file isn't empty
      if (shouldDownloadFile(outputPath)) {
        throw new Error("Downloaded file is empty");
      }

      console.log(`Successfully ${action.toLowerCase()} ${image.date}.png`);
    } catch (error) {
      console.error(`Failed to download ${image.date}.png:`, error.message);
      // Try to clean up the failed download
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
        } catch (cleanupError) {
          console.error(`Failed to clean up empty file ${outputPath}:`, cleanupError);
        }
      }
    }

    // Add delay between downloads to avoid rate limiting
    await delay(DELAY_BETWEEN_DOWNLOADS);
  }
}

async function main() {
  const datasets = neoDatasets as Datasets;

  // Create base output directory if it doesn't exist
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  if (ONLY_DOWNLOAD_FIRST_DATASET) {
    const datasetId = Object.keys(datasets)[0];
    const dataset = datasets[datasetId];
    const limitedDataset = {
      ...dataset,
      images: dataset.images.slice(0, NUMBER_OF_IMAGES_TO_DOWNLOAD)
    };
    await processDataset(datasetId, limitedDataset);
  } else {
    // Process each dataset
    for (const [datasetId, dataset] of Object.entries(datasets)) {
      await processDataset(datasetId, dataset);
    }
  }
}

main().catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
});
