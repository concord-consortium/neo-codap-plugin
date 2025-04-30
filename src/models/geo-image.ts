import {
  NeoDataset,
  NeoImageInfo,
  kLatitudeMin,
  kLatitudeRange,
  kLongitudeMin,
  kLongitudeRange
} from "./neo-types";
import { kUseS3 } from "./config";

interface ColorValue {
  r: number;
  g: number;
  b: number;
}

interface PixelCoordinate {
  x: number;
  y: number;
}

/**
 * GeoImage represents a single geographic image and provides methods to process it.
 * Each instance is tied to a specific image and should be disposed after use.
 */
export class GeoImage {
  private img?: HTMLImageElement;
  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D;

  /**
   * Creates a new GeoImage instance
   */
  constructor(
    private readonly imageInfo: NeoImageInfo,
    private readonly neoDataset: NeoDataset
  ) {}

  /**
   * Generates the URL for a NEO dataset image
   * @returns The complete URL for the image
   */
  get imageUrl(): string {
    if (kUseS3) {
      return this.neoDataset.getS3ImageUrl(this.imageInfo.date);
    }
    return this.neoDataset.getNeoSiteImageUrl(this.imageInfo.id);
  }

  /**
   * Loads an image from a URL
   * @param url - The URL to load the image from
   * @returns Promise resolving to this GeoImage instance for chaining
   */
  public async loadFromUrl(url: string): Promise<GeoImage> {
    return new Promise((resolve, reject) => {
      this.img = new Image();
      this.img.crossOrigin = "anonymous"; // Required for canvas operations
      this.img.onload = () => resolve(this);
      this.img.onerror = () => reject(new Error(`Failed to load image ${url}`));
      this.img.src = url;
    });
  }

  /**
   * Loads an image using the imageInfo provided in the constructor
   * @returns Promise resolving to this GeoImage instance for chaining
   */
  public async loadFromNeoDataset(): Promise<GeoImage> {
    return this.loadFromUrl(this.imageUrl);
  }

  /**
   * Converts latitude and longitude to pixel coordinates
   * @param lat - Latitude (-90 to 90)
   * @param long - Longitude (-180 to 180)
   * @returns Pixel coordinates in the image
   */
  private latLongToPixel(lat: number, long: number): PixelCoordinate {
    if (!this.img) {
      throw new Error("Image not loaded");
    }

    const imageWidth = this.img.naturalWidth;
    const imageHeight = this.img.naturalHeight;

    // Validate image dimensions
    if (imageWidth <= 0 || imageHeight <= 0) {
      throw new Error("Invalid image dimensions");
    }

    // Normalize longitude from -180...180 to 0...360
    const normalizedLong = long - kLongitudeMin;
    // Normalize latitude from -90...90 to 0...180
    const normalizedLat = lat - kLatitudeMin;
    // Convert to percentages
    const xPercent = normalizedLong / kLongitudeRange;
    const yPercent = normalizedLat / kLatitudeRange;

    // Convert to pixel coordinates
    // Note: y is inverted because image coordinates go top-down
    return {
      x: Math.floor(xPercent * imageWidth),
      y: Math.floor((1 - yPercent) * imageHeight)
    };
  }

  /**
   * Extracts the color value at a specific latitude and longitude
   * @param lat - Latitude (-90 to 90)
   * @param long - Longitude (-180 to 180)
   * @returns RGB color value
   */
  public extractColor(lat: number, long: number): ColorValue {
    if (!this.img) {
      throw new Error("Image not loaded");
    }

    // Ensure the image is loaded and has dimensions
    if (!this.img.complete || !this.img.naturalWidth || !this.img.naturalHeight) {
      throw new Error("Image not fully loaded or has invalid dimensions");
    }

    // Create canvas on first use
    if (!this.canvas || !this.ctx) {
      this.canvas = document.createElement("canvas");
      this.canvas.width = this.img.naturalWidth;
      this.canvas.height = this.img.naturalHeight;
      const ctx = this.canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }
      this.ctx = ctx;
      // Draw image to canvas only once
      this.ctx.drawImage(this.img, 0, 0);
    }

    // Get pixel coordinates using actual image dimensions
    const { x, y } = this.latLongToPixel(lat, long);

    // Get pixel data
    const pixel = this.ctx.getImageData(x, y, 1, 1).data;

    return {
      r: pixel[0],
      g: pixel[1],
      b: pixel[2]
    };
  }

  /**
   * Converts RGB values to a hex color string
   * @param color - RGB color value
   * @returns Hex color string in format #RRGGBB
   */
  public static rgbToHex(color: ColorValue): string {
    // if color is black return #949494
    if (color.r === 0 && color.g === 0 && color.b === 0) {
      return "#949494";
    }
    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  }

  /**
   * Converts RGB values to a single number
   * @param color - RGB color value
   * @returns Number representation of the RGB color
   */
  public static rgbToNumber(color: ColorValue): number {
    // eslint-disable-next-line no-bitwise
    return (color.r << 16) | (color.g << 8) | color.b;
  }

  /**
   * Disposes of resources used by this GeoImage instance
   */
  public dispose(): void {
    if (this.canvas) {
      // Clear the canvas
      this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
      // Remove references
      this.canvas = undefined;
      this.ctx = undefined;
    }
    // Remove reference to the image
    this.img = undefined;
  }
}

if (navigator.webdriver) {
  // Add the image processor to the window object for testing
  (window as any).GeoImage = GeoImage;
}
