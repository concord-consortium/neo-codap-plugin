/**
 * There are two parts to each NEO dataset:
 * 1. The dataset configuration
 * 2. The scraped information about the dataset
 *
 * This dataset configuration is manually entered info about the dataset. The list
 * of configs defines which datasets we currently support.
 * These configurations are defined in `neo-dataset-configs.ts`.
 *
 * The scraped information contains the max resolution of the dataset along with
 * information about each image in the dataset. This image information can be used
 * to get a URL to download the image. The scraped information is updated by
 * running the `scrape-neo-datasets.ts` script. It uses the list of configs to
 * know which datasets to scrape.
 *
 * TODO: more of the information could be scraped. So then the configuration
 * could just be the dataset id.
 */
import _scrapedNeoDatasets from "../data/neo-dataset-images.json" with { type: "json" };
import { kNeoDatasetConfigs } from "./neo-dataset-configs";
import { NeoDataset, ScrapedNeoDatasetMap } from "./neo-types";

const scrapedNeoDatasets = _scrapedNeoDatasets as ScrapedNeoDatasetMap;

/**
 * The NEO datasets that we support. This combines the dataset configuration with
 * the scraped information about the dataset.
 */
export const kNeoDatasets = kNeoDatasetConfigs.map(config =>
  new NeoDataset(config, scrapedNeoDatasets[config.id])
);

