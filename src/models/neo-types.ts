import { kDefaultResolution, kNeoBaseUrl, kS3BaseUrl, Resolution } from "./config";

export type PaletteToValueFunction = (index: number) => number | null;
export interface NeoDatasetConfig {
  /** Unique identifier for the dataset */
  id: string;
  /** Display label shown to users */
  label: string;
  /** Path to the legend image for the dataset */
  legendImage: string;
  /** Function to convert palette index to physical value */
  paletteToValue: PaletteToValueFunction;
}

export interface NeoImageInfo {
  date: string;
  id: string;
}

export interface ScrapedNeoDatasetInfo {
  images: NeoImageInfo[];
  maxResolution: Resolution;
}

export type ScrapedNeoDatasetMap = Record<string, ScrapedNeoDatasetInfo>;

export class NeoDataset {
  id: string;
  label: string;
  legendImage: string;
  maxResolution: Resolution;
  images: NeoImageInfo[];
  paletteToValue: PaletteToValueFunction;

  constructor(config: NeoDatasetConfig, scrapedInfo: ScrapedNeoDatasetInfo) {
    this.id = config.id;
    this.label = config.label;
    this.legendImage = config.legendImage;
    this.paletteToValue = config.paletteToValue;
    this.maxResolution = scrapedInfo.maxResolution;
    this.images = scrapedInfo.images;
  }

  get resolution(): Resolution {
    // If maxResolution is smaller than our default, use maxResolution
    if (this.maxResolution.width < kDefaultResolution.width ||
        this.maxResolution.height < kDefaultResolution.height) {
      return this.maxResolution;
    }
    return kDefaultResolution;
  }

  get resolutionString(): string {
    return `${this.resolution.width}x${this.resolution.height}`;
  }

  getNeoSiteImageUrl(imageId: string): string {
    return `${kNeoBaseUrl}?si=${imageId}&cs=rgb&format=PNG` +
      `&width=${this.resolution.width}&height=${this.resolution.height}`;
  }

  getS3ImageUrl(date: string): string {
    return `${kS3BaseUrl}/${this.id}/${this.resolutionString}/${date}.png`;
  }
}

// Geographic constants
export const kLongitudeMin = -180;
export const kLongitudeMax = 180;
export const kLongitudeRange = kLongitudeMax - kLongitudeMin;
export const kLatitudeMin = -90;
export const kLatitudeMax = 90;
export const kLatitudeRange = kLatitudeMax - kLatitudeMin;
