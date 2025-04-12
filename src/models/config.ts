/**
 * URL for downloading images from the NEO website
 */
export const kNeoBaseUrl = "https://neo.gsfc.nasa.gov/servlet/RenderData";

/**
 * URL for downloading images from the S3 bucket
 */
export const kS3BaseUrl = "https://models-resources.concord.org/neo-images/v1";

/**
 * Whether to load images in parallel. The NEO site seems to
 * be rate limited. So loading the in parallel resulted in errors after
 * loading about 200 images. But if you are using the S3 bucket then you
 * can load them in parallel safely.
 */
export const kParallelLoad = true;

/**
 * The delay between loading images serially.
 */
export const kImageLoadDelay = 500;

/**
 * The maximum number of images to process when loading serially.
 * With a 100ms delay the NEO site blocked my request after 201 images
 * and a total transfer size of 27.2 MB.
 * This blocking applied to the whole website not just downloading images.
 * So to be safe, the number of images is limited to 100.
 */
export const kMaxImages = 100;

/**
 * Whether to use the S3 bucket to download images at runtime.
 */
export const kUseS3 = true;

/**
 * A demo location. This was the location of Boston, MA with a longitude of -71.0565
 * However that is right on the coast so it was picking up the water instead
 * of the land. So we moved it a little further inland to 42.3555, -73
 */
export const kDemoLocation = {
  latitude: 42.3555,
  longitude: -73
};

/**
 * This is called resolution but really it is the size of the image on the NEO
 * website.
 */
export interface Resolution {
  width: number;
  height: number;
}

/**
 * The default resolution to use when downloading images at runtime and when
 * copying the images to the S3 bucket.
 *
 * TODO: The S3 bucket copying script should probably just copy all available
 * resolutions not just the default resolution.
 */
export const kDefaultResolution = { width: 720, height: 360 };
