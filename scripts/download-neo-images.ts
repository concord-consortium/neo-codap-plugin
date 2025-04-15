import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import sharp from "sharp";
import { kNeoDatasets } from "../src/models/neo-datasets.js";
import { NeoDataset } from "../src/models/neo-types.js";

// To upload the files to S3
// aws s3 sync neo-images s3://models-resources/neo-images/v1 --exclude "*.DS_Store" --cache-control "max-age=31536000"

const outputDir = "neo-images";
const delayBetweenDownloads = 2000; // milliseconds
const maxRetries = 3;
const initialRetryDelay = 5000; // 5 seconds

/**
 * Setting this to true is useful to testing so the script doesn't take too long
 * to run.
 */
const onlyDownloadFirstDataset = false;

/**
 * When only downloading the first dataset, this value limits how many images
 * are downloaded.
 */
const maxNumberOfImagesToDownload = 10;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function validatePngFile(filePath: string): Promise<boolean> {
  try {
    // Try to load and get metadata from the image
    const metadata = await sharp(filePath).metadata();

    // Check if it's a PNG and has valid dimensions
    return metadata.format === "png" &&
           metadata.width !== undefined &&
           metadata.height !== undefined &&
           metadata.width > 0 &&
           metadata.height > 0;
  } catch (error) {
    console.error(`Error validating PNG file ${filePath}:`, error);
    return false;
  }
}

async function shouldDownloadFile(filePath: string): Promise<boolean> {
  if (!fs.existsSync(filePath)) {
    return true;
  }

  try {
    const stats = fs.statSync(filePath);
    // Return true if file is empty (0 bytes)
    if (stats.size === 0) {
      return true;
    }

    // Validate the existing PNG file
    const isValidPng = await validatePngFile(filePath);
    if (!isValidPng) {
      console.log(`Invalid PNG file found at ${filePath}, will re-download`);
      return true;
    }

    return false;
  } catch (error) {
    console.log(`Error checking file ${filePath}:`, error);
    // If we can't check the file for some reason, try downloading it again
    return true;
  }
}

async function downloadImageWithRetry(url: string, outputPath: string, retryCount = 0): Promise<void> {
  try {
    const response = await fetch(url);
    console.log(`Response status: ${response.status} (attempt ${retryCount + 1}/${maxRetries + 1})`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response body!");
    }

    // Write the response body to the output file
    await pipeline(response.body, fs.createWriteStream(outputPath));

    // Validate the downloaded PNG file
    const isValidPng = await validatePngFile(outputPath);
    if (!isValidPng) {
      throw new Error("Downloaded file is not a valid PNG");
    }

  } catch (error) {
    // Clean up any partial or invalid downloads
    if (fs.existsSync(outputPath)) {
      try {
        fs.unlinkSync(outputPath);
      } catch (cleanupError) {
        console.error(`Failed to clean up file ${outputPath}:`, cleanupError);
      }
    }

    if (retryCount < maxRetries) {
      const retryDelay = initialRetryDelay * Math.pow(2, retryCount);
      console.log(
        `Download failed (attempt ${retryCount + 1}/${maxRetries + 1}). Retrying in ${retryDelay/1000} seconds...`
      );
      await delay(retryDelay);
      return downloadImageWithRetry(url, outputPath, retryCount + 1);
    }

    console.error(`Error downloading image from ${url} after ${maxRetries + 1} attempts:`, error.message);
    throw error;
  }
}

async function processDataset(dataset: NeoDataset): Promise<void> {
  const { resolutionString } = dataset;
  const datasetId = dataset.id;
  const datasetDir = path.join(outputDir, datasetId, resolutionString);
  const images = dataset.images;

  // Create directories if they don't exist
  fs.mkdirSync(datasetDir, { recursive: true });

  console.log(`Processing dataset: ${datasetId}`);
  console.log(`Using resolution: ${resolutionString}`);
  console.log(`Total images to download: ${images.length}`);

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const outputPath = path.join(datasetDir, `${image.date}.png`);

    const shouldDownload = await shouldDownloadFile(outputPath);
    if (!shouldDownload) {
      console.log(`Skipping ${image.date}.png (already exists and valid)`);
      continue;
    }

    const url = dataset.getNeoSiteImageUrl(image.id);

    const action = fs.existsSync(outputPath) ? "Re-downloading" : "Downloading";
    console.log(`${action} ${image.date}.png (${i + 1}/${images.length})`);

    try {
      await downloadImageWithRetry(url, outputPath);

      // Verify the downloaded file isn't empty and is valid
      const shouldRedownload = await shouldDownloadFile(outputPath);
      if (shouldRedownload) {
        throw new Error("Downloaded file is empty or invalid");
      }

      console.log(`Successfully ${action.toLowerCase()} ${image.date}.png`);
    } catch (error) {
      console.error(`Failed to download ${image.date}.png:`, error.message);
      // Try to clean up the failed download
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
        } catch (cleanupError) {
          console.error(`Failed to clean up invalid file ${outputPath}:`, cleanupError);
        }
      }
    }

    // Add delay between downloads to avoid rate limiting
    await delay(delayBetweenDownloads);
  }
}

async function main() {
  // Create base output directory if it doesn't exist
  fs.mkdirSync(outputDir, { recursive: true });

  if (onlyDownloadFirstDataset) {
    const dataset = kNeoDatasets[0];
    const limitedDataset = {
      ...dataset,
      images: dataset.images.slice(0, maxNumberOfImagesToDownload)
    };
    await processDataset(limitedDataset);
  } else {
    // Process each dataset
    for (const dataset of kNeoDatasets) {
      await processDataset(dataset);
    }
  }
}

main().catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
});
