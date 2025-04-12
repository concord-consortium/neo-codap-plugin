import fetch from "node-fetch";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import { kNeoDatasetConfigs } from "../src/models/neo-datasets";

interface ImageInfo {
  date: string;
  id: string;
}

interface DatasetInfo {
  images: ImageInfo[];
  maxResolution: {
    width: number;
    height: number;
  };
}

type DatasetImages = Record<string, DatasetInfo>;

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url);
  return await response.text();
}

function extractDatasetCalls(html: string): {id: string, date: string}[] {
  const regex = /viewDataset\('(\d+)','(\d{4}-\d{2}-\d{2})'\)/g;
  const matches = [...html.matchAll(regex)];
  return matches.map(match => ({
    id: match[1],
    date: match[2]
  }));
}

function constructImageUrl(id: string): string {
  return `https://neo.gsfc.nasa.gov/servlet/RenderData?si=${id}&cs=rgb&format=PNG&width=720&height=360`;
}

function processYearHtml(yearHtml: string, imageInfos: ImageInfo[]) {
  const datasetCalls = extractDatasetCalls(yearHtml);

  for (const {id, date} of datasetCalls) {
    imageInfos.push({
      date,
      id
    });

    // Log each URL as we find it
    console.log(`Found image for ${date}`);
  }
}

async function processDataset(datasetId: string): Promise<DatasetInfo> {
  const baseUrl = `https://neo.gsfc.nasa.gov/view.php?datasetId=${datasetId}`;
  const imageInfos: ImageInfo[] = [];

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
  const results: DatasetImages = {};

  // Process each dataset
  for (const dataset of kNeoDatasetConfigs) {
    console.log(`Starting to process dataset: ${dataset.id}`);
    results[dataset.id] = await processDataset(dataset.id);
  }

  // Uncomment to process a single dataset
  // results["MOD_LSTD_CLIM_M"] = await processDataset("MOD_LSTD_CLIM_M");

  // Make sure the data directory exists
  const dataDir = path.join(process.cwd(), "src", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  // Save results
  const outputPath = path.join(dataDir, "neo-dataset-images.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Saved dataset images to ${outputPath}`);
}

main().catch(console.error);
