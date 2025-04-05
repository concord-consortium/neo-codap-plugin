interface ColorValue {
  r: number;
  g: number;
  b: number;
}

interface PixelCoordinate {
  x: number;
  y: number;
}

// TODO: there should probably be one of these per image. This way multiple locations can be looked
// up for the same image. And it can dispose of the image and canvas when it is done.
export class ImageProcessor {
  // TODO: this should support different resolutions, so if possible the image width and height
  // should be figured out from the image itself.
  private readonly kImageWidth = 720;
  private readonly kImageHeight = 360;

  // TODO: these should be moved out of the class and just be constants
  private readonly kLongitudeRange = 360; // -180 to 180
  private readonly kLatitudeRange = 180;  // -90 to 90
  private readonly kBaseUrl = "https://neo.gsfc.nasa.gov/servlet/RenderData";

  /**
   * Generates the URL for a NEO dataset image
   * @param id - The dataset image ID
   * @returns The complete URL for the image
   */
  private generateImageUrl(id: string): string {
    return `${this.kBaseUrl}?si=${id}&cs=rgb&format=PNG&width=${this.kImageWidth}&height=${this.kImageHeight}`;
  }

  /**
   * Loads an image from the NEO service
   * @param id - The dataset image ID
   * @returns Promise resolving to an HTMLImageElement
   */
  public async loadImageFromNeoDatasetId(id: string): Promise<HTMLImageElement> {
    return this.loadImageFromUrl(this.generateImageUrl(id));
  }

  /**
   * Loads an image from the NEO service
   * @param id - The dataset image ID
   * @returns Promise resolving to an HTMLImageElement
   */
  public async loadImageFromUrl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // Required for canvas operations
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image ${url}`));
      img.src = url;
    });
  }

  /**
   * Converts latitude and longitude to pixel coordinates
   * @param lat - Latitude (-90 to 90)
   * @param long - Longitude (-180 to 180)
   * @returns Pixel coordinates in the image
   */
  public latLongToPixel(lat: number, long: number): PixelCoordinate {
    // Normalize longitude from -180...180 to 0...360
    const normalizedLong = long + 180;
    // Normalize latitude from -90...90 to 0...180
    const normalizedLat = lat + 90;

    // Convert to percentages
    const xPercent = normalizedLong / this.kLongitudeRange;
    const yPercent = normalizedLat / this.kLatitudeRange;

    // TODO: we should not round here, instead it should probably be using floor.
    // If the pixel value is at 4.9 then it should be in the 4 pixel.
    // Convert to pixel coordinates
    // Note: y is inverted because image coordinates go top-down
    return {
      x: Math.round(xPercent * this.kImageWidth),
      y: Math.round((1 - yPercent) * this.kImageHeight)
    };
  }

  /**
   * Extracts the color value at a specific latitude and longitude
   * @param img - The loaded image
   * @param lat - Latitude (-90 to 90)
   * @param long - Longitude (-180 to 180)
   * @returns RGB color value
   */
  public extractColor(img: HTMLImageElement, lat: number, long: number): ColorValue {
    // Create a canvas to read pixel data
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    // Draw image to canvas
    ctx.drawImage(img, 0, 0);

    // Get pixel coordinates
    const { x, y } = this.latLongToPixel(lat, long);

    console.log("x", x, "y", y);

    // Get pixel data
    const pixel = ctx.getImageData(x, y, 1, 1).data;

    console.log("Loaded Pixel", pixel);

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
  public rgbToHex(color: ColorValue): string {
    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  }
}

if (navigator.webdriver) {
  // Add the image processor to the window object for testing
  (window as any).ImageProcessor = ImageProcessor;
}
