import { NeoImageInfo } from "./neo-datasets";

interface ColorValue {
  r: number;
  g: number;
  b: number;
}

interface PixelCoordinate {
  x: number;
  y: number;
}

const kLongitudeRange = 360; // -180 to 180
const kLatitudeRange = 180;  // -90 to 90
const kNeoBaseUrl = "https://neo.gsfc.nasa.gov/servlet/RenderData";

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
  constructor(private readonly imageDef:NeoImageInfo) {}

  /**
   * Generates the URL for a NEO dataset image
   * @returns The complete URL for the image
   */
  private generateImageUrl(): string {
    // FIXME: this always requests 720x360 but some datasets don't have that resolution
    return `${kNeoBaseUrl}?si=${this.imageDef.id}&cs=rgb&format=PNG&width=720&height=360`;
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
   * Loads an image from the NEO service using the ID provided in the constructor
   * @returns Promise resolving to this GeoImage instance for chaining
   */
  public async loadFromNeoDataset(): Promise<GeoImage> {
    if (!this.imageDef.id) {
      throw new Error("No image ID provided");
    }
    return this.loadFromUrl(this.generateImageUrl());
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
    const normalizedLong = long + 180;
    // Normalize latitude from -90...90 to 0...180
    const normalizedLat = lat + 90;

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
    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
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
