// This can be run with `npx tsx scrape-neo-images.ts`
import * as cheerio from "cheerio";
import * as fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { kNeoDatasetConfigs } from "../src/models/neo-dataset-configs.js";
import { NeoImageInfo, ScrapedNeoDatasetInfo, ScrapedNeoDatasetMap } from "../src/models/neo-types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fetchHtml(url: string): Promise<string> {
  // Delay to avoid overwhelming the server
  await new Promise(resolve => setTimeout(resolve, 500));
  const response = await fetch(url);
  return await response.text();
}

function extractImageInfos(html: string): NeoImageInfo[] {
  const regex = /viewDataset\('(\d+)','(\d{4}-\d{2}-\d{2})'\)/g;
  const matches = [...html.matchAll(regex)];
  return matches.map(match => ({
    id: match[1],
    date: match[2]
  }));
}

function processYearHtml(yearHtml: string, imageInfos: NeoImageInfo[]) {
  const yearImageInfos = extractImageInfos(yearHtml);

  for (const imageInfo of yearImageInfos) {
    imageInfos.push(imageInfo);

    // Log each URL as we find it
    console.log(`Found image for ${imageInfo.date}`);
  }
}

async function processDataset(datasetId: string): Promise<ScrapedNeoDatasetInfo> {
  const baseUrl = `https://neo.gsfc.nasa.gov/view.php?datasetId=${datasetId}`;
  const imageInfos: NeoImageInfo[] = [];

  // Get the initial page to get resolution and years
  const initialHtml = await fetchHtml(baseUrl);
  const $ = cheerio.load(initialHtml);

  // Get max resolution from the last size option's download link
  const lastSizeOption = $(".size-option").last();
  const downloadLink = lastSizeOption.find("a.download").first();
  const sizeText = downloadLink.text().trim();
  const [width, height] = sizeText.split(" x ").map(Number);
  const maxResolution = { width, height };

  console.log(`Found max resolution for ${datasetId}:`, maxResolution);

  const years = $("#year-list option").map((_, el) => $(el).val()).get();
  console.log(`Processing dataset ${datasetId}: Found ${years.length} years`);

  if (years.length === 0) {
    processYearHtml(initialHtml, imageInfos);
  } else {

    // Uncomment to only process the first year
    // years = years.slice(0, 1);

    // Process each year
    for (const year of years) {
      const yearUrl = `${baseUrl}&year=${year}`;
      console.log(`Processing year ${year}`);

      const yearHtml = await fetchHtml(yearUrl);
      processYearHtml(yearHtml, imageInfos);
    }
  }
  return {
    images: imageInfos,
    maxResolution
  };
}

async function main() {
  const results: ScrapedNeoDatasetMap = {};

  // Process each dataset
  for (const dataset of kNeoDatasetConfigs) {
    console.log(`Starting to process dataset: ${dataset.id}`);
    results[dataset.id] = await processDataset(dataset.id);
  }

  // Uncomment to process a single dataset
  // results.MOD_LSTD_CLIM_M = await processDataset("MOD_LSTD_CLIM_M");

  // Make sure the data directory exists
  const dataDir = path.join(__dirname, "..", "src", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Save results
  const outputPath = path.join(dataDir, "neo-dataset-images.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Saved dataset images to ${outputPath}`);
}

main().catch(console.error);
