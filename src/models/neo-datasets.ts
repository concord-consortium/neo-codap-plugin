/**
 * There are two parts to each NEO dataset:
 * 1. The dataset configuration
 * 2. The scraped information about the dataset
 *
 * This dataset configuration is manually entered info about the dataset. The list
 * of configs defines which datasets we currently support.
 * These configurations are defined directly in this file.
 *
 * The scraped information contains the max resolution of the dataset along with
 * information about each image in the dataset. This image information can be used
 * to get a URL to download the image. The scraped information is updated by
 * running the `scrape-neo-datasets.ts` script. It uses the list of configs to
 * know which datasets to scrape.
 *
 * TODO: more of the information could be scraped. So then the configuration
 * could just be the dataset id and whether it is the default dataset.
 */
import _scrapedNeoDatasets from "../data/neo-dataset-images.json";

export interface NeoImageInfo {
  date: string;
  id: string;
}

interface ScapedNeoDatasetInfo {
  images: NeoImageInfo[];
  maxResolution: {
    width: number;
    height: number;
  };
}

type ScapedNeoDatasetMap = Record<string, ScapedNeoDatasetInfo>;

const scapedNeoDatasets = _scrapedNeoDatasets as ScapedNeoDatasetMap;

/**
 * Configuration for a selectable dataset
 */
export interface NeoDatasetConfig {
  /** Unique identifier for the dataset */
  id: string;
  /** Display label shown to users */
  label: string;
  /** Path to the legend image for the dataset */
  legendImage: string;
}

/**
 * The NEO dataset configs that we support
 */
export const kNeoDatasetConfigs: NeoDatasetConfig[] = [
  {
    id: "GPM_3IMERGM",
    label: "Rainfall",
    legendImage: "https://neo.gsfc.nasa.gov/palettes/trmm_rainfall_m.png"
  },
  {
    id: "MOP_CO_M",
    label: "Carbon Monoxide",
    legendImage: "https://neo.gsfc.nasa.gov/palettes/mopitt_co.png"
  },
  {
    id: "AURA_NO2_M",
    label: "Nitrogen Dioxide",
    legendImage: "https://neo.gsfc.nasa.gov/palettes/omi_no2.png"
  },
  {
    id: "MOD_NDVI_M",
    label: "Vegetation Index",
    legendImage: "https://neo.gsfc.nasa.gov/palettes/modis_ndvi.png"
  },
  {
    id: "MOD_LSTD_CLIM_M",
    label: "Land Surface Temperature [day]",
    legendImage: "https://neo.gsfc.nasa.gov/palettes/modis_lst.png"
  },
  {
    id: "MOD14A1_M_FIRE",
    label: "Active Fires",
    legendImage: "https://neo.gsfc.nasa.gov/palettes/modis_fire_l3.png"
  }
];

export interface NeoDataset extends NeoDatasetConfig {
  /** Maximum resolution of the dataset */
  maxResolution: {
    width: number;
    height: number;
  };
  /** Information about images in the dataset */
  images: NeoImageInfo[];
}

/**
 * The NEO datasets that we support. This combines the dataset configuration with
 * the scraped information about the dataset.
 */
export const kNeoDatasets = kNeoDatasetConfigs.map(config => ({
  id: config.id,
  label: config.label,
  legendImage: config.legendImage,
  maxResolution: scapedNeoDatasets[config.id].maxResolution,
  images: scapedNeoDatasets[config.id].images
}));

